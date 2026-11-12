import { DatabaseType } from '../../../src/types'
import { patchPackageJson } from './native/context'

type Files = Record<string, string>
export type BrokerType = Extract<DatabaseType, 'redis' | 'valkey' | 'rabbitmq' | 'kafka' | 'nats'>

export const BROKER_TYPES: BrokerType[] = ['redis', 'valkey', 'rabbitmq', 'kafka', 'nats']
export const isBrokerType = (type: DatabaseType): type is BrokerType => (BROKER_TYPES as string[]).includes(type)

/** Environment variable each broker's connection string is written to in the app's .env. */
export const BROKER_ENV: Record<BrokerType, string> = { redis: 'REDIS_URL', valkey: 'REDIS_URL', rabbitmq: 'RABBITMQ_URL', kafka: 'KAFKA_BROKERS', nats: 'NATS_URL' }

const NODE_DEPS: Record<string, { deps: Record<string, string>; devDeps?: Record<string, string> }> = {
  redis: { deps: { ioredis: '^5.4.0' } },
  rabbitmq: { deps: { amqplib: '^0.10.4' }, devDeps: { '@types/amqplib': '^0.10.5' } },
  kafka: { deps: { kafkajs: '^2.2.4' } },
  nats: { deps: { nats: '^2.28.0' } }
}

function nodeClient(broker: string, isTS: boolean): string {
  const t = (annotation: string) => (isTS ? annotation : '')
  switch (broker) {
    case 'redis':
      return `import { Redis } from 'ioredis';

// Connects on first use. REDIS_URL comes from this app's .env.
export const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', { lazyConnect: true });

/** Connect, publish to a channel and return PONG: a quick readiness check. */
export async function pingRedis()${t(': Promise<string>')} {
  if (redis.status === 'wait') await redis.connect();
  return redis.ping();
}

export async function publish(channel${t(': string')}, message${t(': string')}) {
  if (redis.status === 'wait') await redis.connect();
  return redis.publish(channel, message);
}
`
    case 'rabbitmq':
      return `import amqp from 'amqplib';

const url = process.env.RABBITMQ_URL ?? 'amqp://localhost:5672';

export async function publish(queue${t(': string')}, message${t(': string')}) {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(message));
  await channel.close();
  await connection.close();
}

export async function subscribe(queue${t(': string')}, onMessage${t(': (body: string) => void | Promise<void>')}) {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  await channel.assertQueue(queue, { durable: true });
  await channel.consume(queue, async (msg${t(': amqp.ConsumeMessage | null')}) => {
    if (!msg) return;
    await onMessage(msg.content.toString());
    channel.ack(msg);
  });
  return connection;
}
`
    case 'kafka':
      return `import { Kafka } from 'kafkajs';

const kafka = new Kafka({ clientId: process.env.APP_NAME ?? 'app', brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',') });

export async function publish(topic${t(': string')}, message${t(': string')}) {
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({ topic, messages: [{ value: message }] });
  await producer.disconnect();
}

export async function subscribe(topic${t(': string')}, groupId${t(': string')}, onMessage${t(': (value: string) => void | Promise<void>')}) {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  await consumer.run({ eachMessage: async ({ message }) => onMessage(message.value?.toString() ?? '') });
  return consumer;
}
`
    default:
      return `import { connect, StringCodec } from 'nats';

const codec = StringCodec();
const servers = process.env.NATS_URL ?? 'nats://localhost:4222';

export async function publish(subject${t(': string')}, message${t(': string')}) {
  const connection = await connect({ servers });
  connection.publish(subject, codec.encode(message));
  await connection.drain();
}

export async function subscribe(subject${t(': string')}, onMessage${t(': (data: string) => void | Promise<void>')}) {
  const connection = await connect({ servers });
  const subscription = connection.subscribe(subject);
  (async () => {
    for await (const message of subscription) await onMessage(codec.decode(message.data));
  })();
  return connection;
}
`
  }
}

const PY_REQUIREMENTS: Record<string, string> = { redis: 'redis>=5.0', rabbitmq: 'pika>=1.3', kafka: 'confluent-kafka>=2.5', nats: 'nats-py>=2.9' }

function pythonClient(broker: string): string {
  switch (broker) {
    case 'redis':
      return `import os

import redis

client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))


def ping() -> bool:
    return bool(client.ping())


def publish(channel: str, message: str) -> int:
    return client.publish(channel, message)
`
    case 'rabbitmq':
      return `import os

import pika


def _channel(queue: str):
    connection = pika.BlockingConnection(pika.URLParameters(os.getenv("RABBITMQ_URL", "amqp://localhost:5672")))
    channel = connection.channel()
    channel.queue_declare(queue=queue, durable=True)
    return connection, channel


def publish(queue: str, message: str) -> None:
    connection, channel = _channel(queue)
    channel.basic_publish(exchange="", routing_key=queue, body=message.encode())
    connection.close()


def consume_one(queue: str):
    connection, channel = _channel(queue)
    method, _, body = channel.basic_get(queue, auto_ack=True)
    connection.close()
    return body.decode() if method else None
`
    case 'kafka':
      return `import os

from confluent_kafka import Consumer, Producer

BROKERS = os.getenv("KAFKA_BROKERS", "localhost:9092")


def publish(topic: str, message: str) -> None:
    producer = Producer({"bootstrap.servers": BROKERS})
    producer.produce(topic, message.encode())
    producer.flush(10)


def consume_one(topic: str, group_id: str, timeout: float = 5.0):
    consumer = Consumer({"bootstrap.servers": BROKERS, "group.id": group_id, "auto.offset.reset": "earliest"})
    consumer.subscribe([topic])
    message = consumer.poll(timeout)
    consumer.close()
    return message.value().decode() if message and not message.error() else None
`
    default:
      return `import os

import nats

NATS_URL = os.getenv("NATS_URL", "nats://localhost:4222")


async def publish(subject: str, message: str) -> None:
    connection = await nats.connect(NATS_URL)
    await connection.publish(subject, message.encode())
    await connection.drain()


async def request_once(subject: str, message: str, timeout: float = 2.0) -> str:
    connection = await nats.connect(NATS_URL)
    reply = await connection.request(subject, message.encode(), timeout=timeout)
    await connection.drain()
    return reply.data.decode()
`
  }
}

const GO_MODULES: Record<string, string> = {
  redis: 'github.com/redis/go-redis/v9 v9.7.0',
  rabbitmq: 'github.com/rabbitmq/amqp091-go v1.10.0',
  kafka: 'github.com/segmentio/kafka-go v0.4.47',
  nats: 'github.com/nats-io/nats.go v1.37.0'
}

function goClient(broker: string): string {
  switch (broker) {
    case 'redis':
      return `package main

import (
	"context"
	"os"

	"github.com/redis/go-redis/v9"
)

func newRedis() *redis.Client {
	url := os.Getenv("REDIS_URL")
	if url == "" {
		url = "redis://localhost:6379"
	}
	options, err := redis.ParseURL(url)
	if err != nil {
		panic(err)
	}
	return redis.NewClient(options)
}

func pingRedis(ctx context.Context) error {
	return newRedis().Ping(ctx).Err()
}
`
    case 'rabbitmq':
      return `package main

import (
	"context"
	"os"

	amqp "github.com/rabbitmq/amqp091-go"
)

func publishRabbit(ctx context.Context, queue, body string) error {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://localhost:5672"
	}
	connection, err := amqp.Dial(url)
	if err != nil {
		return err
	}
	defer connection.Close()
	channel, err := connection.Channel()
	if err != nil {
		return err
	}
	defer channel.Close()
	if _, err := channel.QueueDeclare(queue, true, false, false, false, nil); err != nil {
		return err
	}
	return channel.PublishWithContext(ctx, "", queue, false, false, amqp.Publishing{ContentType: "text/plain", Body: []byte(body)})
}
`
    case 'kafka':
      return `package main

import (
	"context"
	"os"
	"strings"

	"github.com/segmentio/kafka-go"
)

func kafkaBrokers() []string {
	brokers := os.Getenv("KAFKA_BROKERS")
	if brokers == "" {
		brokers = "localhost:9092"
	}
	return strings.Split(brokers, ",")
}

func publishKafka(ctx context.Context, topic, value string) error {
	writer := &kafka.Writer{Addr: kafka.TCP(kafkaBrokers()...), Topic: topic, AllowAutoTopicCreation: true}
	defer writer.Close()
	return writer.WriteMessages(ctx, kafka.Message{Value: []byte(value)})
}
`
    default:
      return `package main

import (
	"os"

	"github.com/nats-io/nats.go"
)

func publishNats(subject, message string) error {
	url := os.Getenv("NATS_URL")
	if url == "" {
		url = nats.DefaultURL
	}
	connection, err := nats.Connect(url)
	if err != nil {
		return err
	}
	defer connection.Close()
	if err := connection.Publish(subject, []byte(message)); err != nil {
		return err
	}
	return connection.Flush()
}
`
  }
}

/**
 * Adds one connect/publish/subscribe example per broker to a service's starter files, in the
 * service's own language, and registers the client library in its manifest. Only Node, Python and
 * Go services get examples; other ecosystems only receive the connection variable in `.env`.
 */
export function applyBrokerClients(files: Files, brokers: BrokerType[], isTS: boolean): void {
  const kinds = [...new Set(brokers.map(broker => (broker === 'valkey' ? 'redis' : broker)))]
  if (kinds.length === 0) return

  if (files['package.json']) {
    const ext = isTS ? 'ts' : 'js'
    const dir = files['src/index.' + ext] || Object.keys(files).some(file => file.startsWith('src/')) ? 'src/lib' : 'lib'
    for (const kind of kinds) files[`${dir}/${kind}.${ext}`] = nodeClient(kind, isTS)
    patchPackageJson(files, pkg => {
      pkg.dependencies = pkg.dependencies || {}
      for (const kind of kinds) {
        Object.assign(pkg.dependencies, NODE_DEPS[kind].deps)
        if (isTS && NODE_DEPS[kind].devDeps) pkg.devDependencies = { ...(pkg.devDependencies || {}), ...NODE_DEPS[kind].devDeps }
      }
    })
    return
  }

  if (files['requirements.txt'] !== undefined) {
    const dir = files['app/__init__.py'] !== undefined ? 'app/messaging' : 'messaging'
    files[`${dir}/__init__.py`] = ''
    for (const kind of kinds) files[`${dir}/${kind}_client.py`] = pythonClient(kind)
    files['requirements.txt'] = files['requirements.txt'].replace(/\n*$/, '\n') + '\n# Messaging and caching clients\n' + kinds.map(kind => PY_REQUIREMENTS[kind]).join('\n') + '\n'
    return
  }

  if (files['go.mod']) {
    for (const kind of kinds) files[`messaging_${kind}.go`] = goClient(kind)
    const requires = kinds.map(kind => `\t${GO_MODULES[kind]}`).join('\n')
    files['go.mod'] = files['go.mod'].replace(/\n*$/, '\n') + `\nrequire (\n${requires}\n)\n`
  }
}
