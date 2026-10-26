# LazyStack - Future Roadmap & Architectural Plans

## Planned Feature: Local Small Language Model Assistant

Add an optional assistant that accepts natural language requests, turns them into a reviewable LazyStack blueprint, and can scaffold it after the user approves the plan. Example: “Create a MERN-style stack, use PostgreSQL instead of MongoDB, and run the API as a separate service.” The assistant should map intent to supported frameworks, databases, service boundaries, ports, and folder structure, then show a diff/summary before generating files.

The assistant should use a locally hosted small language model through a configurable provider (initially Ollama or llama.cpp), with an OpenAI-compatible API where available. LazyStack remains responsible for validating structured output and executing a small allow-listed set of actions; the model must not directly run arbitrary shell commands or write files. Include model download/selection, hardware guidance, endpoint/model configuration, progress and error states, and a way to use LazyStack without an installed model.

See the [Small Language Model Assistant learning and implementation guide](SMALL_LANGUAGE_MODEL_GUIDE.md) for books, papers, documentation, videos, setup, API examples, and an implementation outline.

## Next Release Feature: IoT & Embedded Systems Category

In addition to **Frontend**, **Backend**, and **Fullstack**, LazyStack will introduce a dedicated 4th top-level category: **IoT & Embedded**.

---

### 1. Vision & Architecture
Modern fullstack architectures frequently bridge the physical and digital worlds: smart devices, edge nodes, and hardware sensors need to feed data into backend APIs, message brokers, and realtime frontends.

LazyStack will support end-to-end scaffolding for connected hardware stacks where device firmware lives in the same monorepo as web dashboards, reverse proxies, and ingestion pipelines.

```
my-iot-stack/
├── firmware/                  <-- New IoT Category
│   ├── esp32-sensor/          # PlatformIO / ESP-IDF / MicroPython
│   └── rpi-gateway/           # Python / Go / Rust edge daemon
├── apps/
│   ├── web/                   # React / Next.js Telemetry Dashboard
│   └── api/                   # Go / FastAPI / Express Telemetry Ingestion
├── packages/
│   ├── types/                 # Shared telemetry schemas (JSON / Protobuf)
│   └── shared/                # Validation & protocol constants
├── docker/
│   ├── mosquitto/             # MQTT Broker (1-click orchestrator)
│   └── emqx/                  # Enterprise MQTT (optional)
├── docker-compose.yml
└── lazystack.json
```

---

### 2. Supported Hardware Targets & Frameworks

#### A. PlatformIO (Platfiom IO / Platform.io) Core Integration
*The premier cross-platform embedded build system & package manager for IoT microcontrollers.*
- **Unified `platformio.ini` Multi-Environment Orchestrator**:
  - Automatically provisions multi-board environments:
    - `[env:esp32dev]` (Espressif ESP32 dual-core WiFi/BLE)
    - `[env:esp32-s3-devkitc-1]` (ESP32-S3 AI / USB OTG)
    - `[env:nodemcuv2]` (ESP8266 IoT sensor node)
    - `[env:pico]` (Raspberry Pi RP2040 dual ARM Cortex-M0+)
    - `[env:uno]` & `[env:megaatmega2560]` (Arduino AVR microcontrollers)
    - `[env:bluepill_f103c8]` & `[env:nucleo_f401re]` (STM32 ARM Cortex-M4)
- **Automated Library Dependency Injection (`lib_deps`)**:
  - Auto-wires production libraries tailored to selected monorepo services:
    - `bblanchon/ArduinoJson` for JSON parsing and telemetry serialization
    - `knolleary/PubSubClient` / `256dpi/arduino-mqtt` for Mosquitto/MQTT broker integration
    - `me-no-dev/ESPAsyncWebServer` for onboard web servers & REST endpoints
    - `me-no-dev/AsyncTCP` for high-throughput async networking
- **Monorepo Task Runner Integration**:
  - `npm run firmware:build` -> `pio run`
  - `npm run firmware:flash` -> `pio run --target upload`
  - `npm run firmware:monitor` -> `pio device monitor --baud 115200`
- **WebSerial In-Browser Flashing**:
  - Direct browser-to-board USB serial firmware upload without requiring host driver installation.
- **LazyStack Studio In-App Serial Console**:
  - Embedded real-time telemetry serial stream viewer inside the LazyStack UI.

#### B. ESP32 & ESP8266 (Native & Alternative Runtimes)
- **ESP-IDF (Native C/FreeRTOS)**: Production-grade firmware template with menuconfig and partition table.
- **MicroPython / CircuitPython**: `boot.py`, `main.py` with `umqtt.simple` integration.
- **Rust Embedded (`esp-idf-template` / Embassy)**: Memory-safe async firmware targeting Xtensa / RISC-V cores.

#### C. Raspberry Pi & Single Board Computers (SBCs)
- **Python Edge Node**: `gpiozero`, `paho-mqtt`, systemd service generator, and camera/I2C sensor readers.
- **Go Edge Daemon (`periph.io`)**: Low-latency GPIO/SPI/I2C peripheral control compiled for ARMv7 / AArch64.
- **Rust Embedded Linux**: Async Tokio + Linux sysfs/cdev GPIO controllers.
- **Node.js IoT**: Johnny-Five / Onoff sensor daemon with WebSocket gateway.
- **ROS 2 (Robot Operating System)**: Publisher/subscriber node skeleton for robotics edge controllers.

#### D. Arduino & Microcontrollers
- **Arduino CLI**: Direct `.ino` sketch generation with board manager package definitions.
- **Firmata Protocol**: Scaffolds host-to-microcontroller bridging configurations for desktop control.

#### E. STM32 & RTOS
- **Zephyr RTOS**: Modular RTOS workspace with West manifest.
- **FreeRTOS**: Standalone multi-tasking C runtime skeleton.

---

### 3. Integrated IoT Protocols & Message Brokers
- **MQTT (Eclipse Mosquitto)**: 1-click Docker Compose service with auto-provisioned `mosquitto.conf` (authenticated or local test mode).
- **EMQX / HiveMQ**: High-throughput broker options for enterprise load testing.
- **WebSockets / Server-Sent Events (SSE)**: Live telemetry streaming from edge broker directly into frontend charts.
- **CoAP / HTTP Webhooks**: Constrained REST alternative for ultra-low-power nodes.

---

### 4. Host Environment Auditor Integration
Extend the desktop auditor (`electron/environment/auditor.ts`) with hardware toolchain detection:
- `platformio` CLI
- `arduino-cli`
- `esptool.py`
- `idf.py` (ESP-IDF)
- `avrdude`
- `mpremote` (MicroPython)
- Serial port scanner (detect plugged-in USB UART bridges like CP2102, CH340, FTDI)

---

### 5. 1-Click IoT Presets
1. **ESP32 Smart Telemetry**:
   - Firmware: ESP32 PlatformIO (WiFi + MQTT)
   - Broker: Eclipse Mosquitto
   - Backend: Go Fiber (MQTT subscriber + PostgreSQL time-series store)
   - Frontend: Next.js 15 realtime gauge & line chart dashboard
2. **Raspberry Pi Edge Vision & Sensor Hub**:
   - Firmware: Python `gpiozero` + OpenCV edge worker
   - Broker: Redis Pub/Sub
   - Backend: FastAPI
   - Frontend: React + Tailwind live telemetry viewer
3. **Industrial MicroPython Fleet**:
   - Firmware: MicroPython on RP2040 / ESP32
   - Database: ClickHouse / TimescaleDB
   - Admin: Redis Commander + Adminer
