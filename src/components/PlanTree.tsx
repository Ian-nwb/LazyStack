import React, { useMemo } from 'react'
import { ProjectSettings } from '../types'
import { planScaffold } from '../../electron/scaffolding/plan'
import { createDatabaseCredentials } from '../../electron/scaffolding/templates/meta'
import { buildPlanTree, PlanTreeNode, PlanTreeOptions } from '../utils/planTree'

/** Builds the display tree for the blueprint from the generator's own plan. */
export function usePlanTree(settings: ProjectSettings, options: PlanTreeOptions = {}): { tree: PlanTreeNode | null; error: string | null } {
  const appDetail = options.appDetail
  return useMemo(() => {
    try {
      const plan = planScaffold(settings, createDatabaseCredentials(settings))
      return { tree: buildPlanTree(plan, settings, { appDetail }), error: null }
    } catch (error) {
      return { tree: null, error: error instanceof Error ? error.message : 'The blueprint could not be planned.' }
    }
  }, [settings, appDetail])
}

const Node: React.FC<{ node: PlanTreeNode; isLast: boolean }> = ({ node, isLast }) => (
  <div>
    <div className={node.kind === 'dir' ? 'text-zinc-100' : 'text-zinc-400'}>
      {isLast ? '└──' : '├──'} {node.kind === 'dir' ? '📁' : '📄'} {node.name}{node.kind === 'dir' ? '/' : ''}
      {node.note && <span className="text-zinc-500 font-sans text-[11px] ml-2">({node.note})</span>}
    </div>
    {(node.children.length > 0 || node.hiddenCount) ? (
      <div className="pl-4 border-l border-surface-700 space-y-0.5">
        {node.children.map((child, index) => (
          <Node key={child.path} node={child} isLast={index === node.children.length - 1 && !node.hiddenCount} />
        ))}
        {node.hiddenCount ? <div className="text-zinc-500">└── … {node.hiddenCount} more</div> : null}
      </div>
    ) : null}
  </div>
)

export const PlanTree: React.FC<{ settings: ProjectSettings }> = ({ settings }) => {
  const { tree, error } = usePlanTree(settings)
  if (error || !tree) {
    return <div className="border border-surface-700 rounded-xl p-5 text-xs text-zinc-400">The directory tree is unavailable until the blueprint is valid: {error}</div>
  }
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-xl p-5 text-zinc-300 leading-relaxed max-w-3xl">
      <div className="text-white font-bold mb-2">📁 {tree.name}/</div>
      <div className="pl-4 border-l border-surface-700 space-y-0.5">
        {tree.children.map((child, index) => <Node key={child.path} node={child} isLast={index === tree.children.length - 1} />)}
      </div>
      <p className="mt-4 text-[11px] text-zinc-500 font-sans">This tree is computed from the files the generator will write. Folders deeper than two levels are collapsed.</p>
    </div>
  )
}
