import React, { useState, useRef } from 'react';
import { ConceptMapData, ConceptMapNode } from '../types';
import { ZoomIn, ZoomOut, RotateCcw, Info, ArrowRight } from 'lucide-react';

interface ConceptMapProps {
  data: ConceptMapData;
  onNodeClick?: (node: ConceptMapNode) => void;
}

export const ConceptMap: React.FC<ConceptMapProps> = ({ data, onNodeClick }) => {
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState<ConceptMapNode | null>(data?.nodes?.[0] || null);

  const nodes = data?.nodes || [];
  const edges = data?.edges || [];

  // Arrange nodes in a nice circular/hierarchical constellation
  const total = nodes.length;
  const centerX = 350;
  const centerY = 240;
  const radius = 170;

  const nodePositions = nodes.map((node, i) => {
    if (i === 0) {
      // Center primary root
      return { ...node, x: centerX, y: centerY };
    }
    const angle = ((i - 1) / (total - 1)) * 2 * Math.PI - Math.PI / 2;
    return {
      ...node,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  const getPosition = (id: string) => {
    const found = nodePositions.find((n) => n.id === id);
    return found ? { x: found.x, y: found.y } : { x: centerX, y: centerY };
  };

  const handleSelect = (node: ConceptMapNode) => {
    setSelectedNode(node);
    if (onNodeClick) onNodeClick(node);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl">
      {/* Visual Canvas Area */}
      <div className="relative flex-1 h-[480px] bg-slate-50 dark:bg-slate-950/60 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-center">
        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
          <button
            onClick={() => setScale((s) => Math.min(s + 0.15, 1.8))}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s - 0.15, 0.6))}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setScale(1)}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* SVG Graph */}
        <svg
          viewBox="0 0 700 480"
          className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-200 select-none"
          style={{ transform: `scale(${scale})` }}
        >
          {/* Edges */}
          {edges.map((edge, idx) => {
            const p1 = getPosition(edge.from_node);
            const p2 = getPosition(edge.to_node);
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            return (
              <g key={idx}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="text-slate-300 dark:text-slate-700"
                />
                <rect
                  x={midX - 35}
                  y={midY - 9}
                  width="70"
                  height="18"
                  rx="9"
                  className="fill-white dark:fill-slate-900 stroke-slate-200 dark:stroke-slate-800 stroke-[1]"
                />
                <text
                  x={midX}
                  y={midY + 3.5}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500 dark:fill-slate-400 font-medium"
                >
                  {edge.relation}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodePositions.map((node) => {
            const isSelected = selectedNode?.id === node.id;
            const isRoot = node.id === nodes[0]?.id;

            return (
              <g
                key={node.id}
                onClick={() => handleSelect(node)}
                className="cursor-pointer group"
                transform={`translate(${node.x}, ${node.y})`}
              >
                {/* Outer Glow Ring if selected */}
                {isSelected && (
                  <circle
                    r="44"
                    className="fill-indigo-500/10 stroke-indigo-500 stroke-[2] animate-pulse"
                  />
                )}

                {/* Node Body */}
                <circle
                  r={isRoot ? "36" : "30"}
                  className={`transition-all duration-150 ${
                    isSelected
                      ? 'fill-indigo-600 stroke-indigo-400 stroke-2'
                      : isRoot
                      ? 'fill-purple-600 dark:fill-purple-700 stroke-purple-400 stroke-2 group-hover:scale-105'
                      : 'fill-white dark:fill-slate-800 stroke-slate-300 dark:stroke-slate-700 stroke-2 group-hover:stroke-indigo-500 group-hover:scale-105'
                  }`}
                />

                {/* Node Label */}
                <text
                  textAnchor="middle"
                  dy="4"
                  className={`text-[11px] font-bold select-none pointer-events-none ${
                    isSelected || isRoot
                      ? 'fill-white'
                      : 'fill-slate-800 dark:fill-slate-200 group-hover:fill-indigo-500'
                  }`}
                >
                  {node.label.length > 14 ? node.label.substring(0, 12) + '..' : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node Details Inspection Sidebar */}
      <div className="w-full lg:w-80 flex flex-col justify-between p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
            <Info className="w-4 h-4" />
            <span>Concept Node Inspector</span>
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 mb-2">
                  {selectedNode.category || 'Core Concept'}
                </span>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedNode.label}
                </h4>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {selectedNode.description ||
                  'Key architectural milestone identified in the lecture. Explore connected concepts to understand theoretical foundations.'}
              </p>

              {/* Connected Concepts */}
              <div className="pt-2">
                <h5 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Related Nodes
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {edges
                    .filter((e) => e.from_node === selectedNode.id || e.to_node === selectedNode.id)
                    .map((e, idx) => {
                      const otherId = e.from_node === selectedNode.id ? e.to_node : e.from_node;
                      const otherNode = nodes.find((n) => n.id === otherId);
                      if (!otherNode) return null;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSelect(otherNode)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-500 transition-colors"
                        >
                          <span>{otherNode.label}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Click any concept node to inspect its relationships and meaning.</p>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400">
          💡 Click any connected node or drag to view systemic dependencies.
        </div>
      </div>
    </div>
  );
};
