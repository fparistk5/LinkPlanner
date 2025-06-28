import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { type Link, type NetworkConnection } from '../hooks/useSupabaseData'

interface GraphViewProps {
  links: (Link & { color?: string })[]
  networkConnections: NetworkConnection[]
  groups?: { id: string; name: string; color: string; parent_group_id?: string | null; display_order: number }[]
  notes?: any[]
  emailAlerts?: any[]
  onAddConnection: (sourceId: string, targetId: string) => Promise<void>
  onDeleteConnection: (id: string) => Promise<void>
  onNoteNodeClick?: (noteId: string) => void
  onLinkNodeClick?: (linkId: string) => void
  onGroupNodeClick?: (groupId: string) => void
  onSavePositions?: (positions: { [key: string]: { x: number; y: number } }) => Promise<void>
  titleFontSize?: number
  activeProfile?: number
  profilePositions?: { [key: string]: { x: number; y: number } }
  canEdit?: boolean
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  title: string
  group: string | null
  isGroup?: boolean
  color?: string
  x?: number
  y?: number
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  id: string
  source: GraphNode
  target: GraphNode
}

export function GraphView({ links, networkConnections, groups = [], notes = [], emailAlerts = [], onAddConnection, onDeleteConnection, onNoteNodeClick, onLinkNodeClick, onGroupNodeClick, onSavePositions, titleFontSize = 12, activeProfile = 1, profilePositions = {}, canEdit = false }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, undefined> | null>(null)
  const [selectedNote, setSelectedNote] = useState<any | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [customTooltipPos, setCustomTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const highlightedNodesRef = useRef<Set<string>>(new Set())
  const nodesRef = useRef<GraphNode[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveAnimation, setSaveAnimation] = useState(false)

  // Cleanup simulation when component unmounts
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
        simulationRef.current = null
      }
    }
  }, [])

  // Drag handlers for tooltip
  const handleTooltipMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!customTooltipPos && tooltipPos) {
      setCustomTooltipPos({ x: tooltipPos.x, y: tooltipPos.y - 56 })
    }
    setIsDragging(true)
    const startX = e.clientX
    const startY = e.clientY
    const pos = customTooltipPos || (tooltipPos ? { x: tooltipPos.x, y: tooltipPos.y - 56 } : { x: 0, y: 0 })
    setDragOffset({ x: startX - pos.x, y: startY - pos.y })
    e.stopPropagation()
    e.preventDefault()
  }

  React.useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragOffset) return
      setCustomTooltipPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y })
    }
    const handleMouseUp = () => {
      setIsDragging(false)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  // Separate effect for text size updates
  useEffect(() => {
    if (!svgRef.current) return
    
    // Update only the text elements
    d3.select(svgRef.current)
      .selectAll('.graph-node text')
      .style('font-size', (d: any) => `${d.isGroup ? titleFontSize * 1.3 : titleFontSize}px`)
  }, [titleFontSize])

  // Main effect for graph rendering - remove titleFontSize from dependencies
  useEffect(() => {
    if (!svgRef.current || (!links.length && !groups.length)) return

    // Clear existing graph
    d3.select(svgRef.current).selectAll('*').remove()
    nodesRef.current = []

    const width = 600
    const height = 600

    // Add group nodes with hierarchical positioning
    const groupNodes: GraphNode[] = []
    const parentGroups = groups.filter(g => !g.parent_group_id)
    const childGroups = groups.filter(g => g.parent_group_id)
    
    // Position top-level groups in a ring based on display_order
    const sortedParentGroups = parentGroups.sort((a, b) => a.display_order - b.display_order)
    sortedParentGroups.forEach((g, i) => {
      const angle = (i * 2 * Math.PI) / Math.max(1, sortedParentGroups.length)
      const radius = Math.min(width, height) * 0.35
      groupNodes.push({
        id: g.id,
        title: g.name,
        group: null,
        isGroup: true,
        color: g.color,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle)
      })
    })
    
    // Position subgroups recursively around their parent groups based on display_order
    const positionSubgroups = (parentId: string | null, level: number = 1) => {
      const subgroupsForParent = childGroups.filter(sg => sg.parent_group_id === parentId)
        .sort((a, b) => a.display_order - b.display_order)
      
      subgroupsForParent.forEach((g, i) => {
        const parentNode = groupNodes.find(gn => gn.id === g.parent_group_id)
        if (parentNode) {
          // Position subgroups in progressively smaller circles, ordered by display_order
          const angle = (i * 2 * Math.PI) / Math.max(1, subgroupsForParent.length)
          const radius = Math.max(40, 80 - (level * 15)) // Smaller radius for deeper nesting
          
          groupNodes.push({
            id: g.id,
            title: g.name,
            group: g.parent_group_id || null,
            isGroup: true,
            color: g.color,
            x: (parentNode.x || width / 2) + radius * Math.cos(angle),
            y: (parentNode.y || height / 2) + radius * Math.sin(angle)
          })
          
          // Recursively position children of this subgroup
          positionSubgroups(g.id, level + 1)
        } else {
          // Fallback positioning if parent not found - use sorted index
          const sortedIndex = childGroups.findIndex(sg => sg.id === g.id)
          const angle = (sortedIndex * 2 * Math.PI) / Math.max(1, childGroups.length)
          const radius = Math.min(width, height) * 0.25
          groupNodes.push({
            id: g.id,
            title: g.name,
            group: g.parent_group_id || null,
            isGroup: true,
            color: g.color,
            x: width / 2 + radius * Math.cos(angle),
            y: height / 2 + radius * Math.sin(angle)
          })
        }
      })
    }
    
    // Start positioning from top-level groups
    sortedParentGroups.forEach(parentGroup => {
      positionSubgroups(parentGroup.id, 1)
    })

    // Position link nodes near their group nodes
    const linkNodes: GraphNode[] = links.map((link, i) => {
      if (link.group_id) {
        // Find the group node this link belongs to
        const groupNode = groupNodes.find(gn => gn.id === link.group_id)
        if (groupNode) {
          // Position links around their group in a small circle
          const linksInGroup = links.filter(l => l.group_id === link.group_id)
          const linkIndex = linksInGroup.findIndex(l => l.id === link.id)
          const angle = (linkIndex * 2 * Math.PI) / Math.max(1, linksInGroup.length)
          const radius = 60 + (linksInGroup.length > 3 ? 20 : 0) // Adjust radius based on number of links
          
          return {
            id: link.id,
            title: link.title,
            group: link.group_id,
            isGroup: false,
            color: link.color,
            x: (groupNode.x || width / 2) + radius * Math.cos(angle),
            y: (groupNode.y || height / 2) + radius * Math.sin(angle)
          }
        }
      }
      
      // Fallback positioning for ungrouped links
      const ungroupedLinks = links.filter(l => !l.group_id)
      const ungroupedIndex = ungroupedLinks.findIndex(l => l.id === link.id)
      const angle = (ungroupedIndex * 2 * Math.PI) / Math.max(1, ungroupedLinks.length)
      const radius = Math.min(width, height) * 0.15
      
      return {
        id: link.id,
        title: link.title,
        group: link.group_id,
        isGroup: false,
        color: link.color,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle)
      }
    })

    // Add note nodes with better initial positioning
    const noteNodes: GraphNode[] = notes.map((note, i) => {
      const angle = (i * 2 * Math.PI) / Math.max(1, notes.length)
      const radius = Math.min(width, height) * 0.25
      return {
        id: note.id,
        title: note.title,
        group: note.group_id || note.link_id || null,
        isGroup: false,
        color: '#fbbf24',
        x: width / 2 + radius * Math.cos(angle),
        y: width / 2 + radius * Math.sin(angle)
      }
    })

    // Add alert date/time nodes
    const alertNodes: GraphNode[] = []
    emailAlerts.forEach((alert, i) => {
      if (alert.scheduled_time) {
        const alertDate = new Date(alert.scheduled_time)
        const dateStr = alertDate.toLocaleDateString()
        const timeStr = alertDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        
        const angle = (i * 2 * Math.PI) / Math.max(1, emailAlerts.length)
        const radius = Math.min(width, height) * 0.15
        
        alertNodes.push({
          id: `alert-${alert.id || i}`,
          title: `${dateStr}\n${timeStr}`,
          group: null,
          isGroup: false,
          color: '#ef4444',
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle)
        })
      }
    })

    // Combine all nodes
    const nodes: GraphNode[] = [...groupNodes, ...linkNodes, ...noteNodes, ...alertNodes]

    // Create links from network connections
    const edges: GraphLink[] = networkConnections.map(conn => {
      const sourceNode = nodes.find(n => n.id === conn.source_link_id)
      const targetNode = nodes.find(n => n.id === conn.target_link_id)
      if (!sourceNode || !targetNode) {
        throw new Error(`Could not find nodes for connection ${conn.id}`)
      }
      return {
        id: conn.id,
        source: sourceNode,
        target: targetNode
      }
    })

    // Add group-link edges (link to group node if grouped)
    links.forEach(link => {
      if (link.group_id) {
        const linkNode = nodes.find(n => n.id === link.id)
        const groupNode = nodes.find(n => n.id === link.group_id && n.isGroup)
        if (linkNode && groupNode) {
          edges.push({
            id: `group-link-${link.id}`,
            source: groupNode,
            target: linkNode
          })
        }
      }
    })

    // Add hierarchical edges between parent and child groups
    groups.forEach(group => {
      if (group.parent_group_id) {
        const childNode = nodes.find(n => n.id === group.id && n.isGroup)
        const parentNode = nodes.find(n => n.id === group.parent_group_id && n.isGroup)
        if (childNode && parentNode) {
          edges.push({
            id: `parent-child-${group.parent_group_id}-${group.id}`,
            source: parentNode,
            target: childNode
          })
        }
      }
    })

    // Add group-group edges (connect top-level groups in a ring)
    const topLevelGroupNodes = groupNodes.filter(gn => !groups.find(g => g.id === gn.id)?.parent_group_id)
    if (topLevelGroupNodes.length > 1) {
      for (let i = 0; i < topLevelGroupNodes.length; i++) {
        const source = topLevelGroupNodes[i]
        const target = topLevelGroupNodes[(i + 1) % topLevelGroupNodes.length]
        edges.push({
          id: `group-group-${source.id}-${target.id}`,
          source,
          target
        })
      }
    }

    // Add edges for notes to their group or link
    notes.forEach(note => {
      if (note.group_id) {
        const noteNode = nodes.find(n => n.id === note.id)
        const groupNode = nodes.find(n => n.id === note.group_id && n.isGroup)
        if (noteNode && groupNode) {
          edges.push({
            id: `note-group-${note.id}`,
            source: noteNode,
            target: groupNode
          })
        }
      } else if (note.link_id) {
        const noteNode = nodes.find(n => n.id === note.id)
        const linkNode = nodes.find(n => n.id === note.link_id && !n.isGroup)
        if (noteNode && linkNode) {
          edges.push({
            id: `note-link-${note.id}`,
            source: noteNode,
            target: linkNode
          })
        }
      }
    })

    // Add edges for alert date/time nodes to their parent nodes
    emailAlerts.forEach((alert, i) => {
      if (alert.scheduled_time) {
        const alertNode = nodes.find(n => n.id === `alert-${alert.id || i}`)
        if (alertNode) {
          // Connect to group if alert has group
          if (alert.group) {
            const groupNode = nodes.find(n => n.id === alert.group && n.isGroup)
            if (groupNode) {
              edges.push({
                id: `alert-group-${alert.id || i}`,
                source: alertNode,
                target: groupNode
              })
            }
          }
          // Connect to link if alert has link
          else if (alert.link) {
            const linkNode = nodes.find(n => n.id === alert.link && !n.isGroup && !notes.some(note => note.id === n.id))
            if (linkNode) {
              edges.push({
                id: `alert-link-${alert.id || i}`,
                source: alertNode,
                target: linkNode
              })
            }
          }
          // Connect to note if alert has note
          else if (alert.note) {
            const noteNode = nodes.find(n => n.id === alert.note && notes.some(note => note.id === n.id))
            if (noteNode) {
              edges.push({
                id: `alert-note-${alert.id || i}`,
                source: alertNode,
                target: noteNode
              })
            }
          }
        }
      }
    })

    // Restore node positions from profilePositions if provided
    if (profilePositions && Object.keys(profilePositions).length > 0) {
      nodes.forEach(node => {
        const savedPos = profilePositions[node.id]
        if (savedPos) {
          node.x = savedPos.x
          node.y = savedPos.y
          node.fx = savedPos.x
          node.fy = savedPos.y
        }
      })
    } else {
      // fallback to localStorage for backward compatibility
      const savedData = localStorage.getItem(`graphPositions_${activeProfile}`)
      if (savedData) {
        try {
          const profileData = JSON.parse(savedData)
          const positions = profileData.positions
          nodes.forEach(node => {
            const savedPos = positions[node.id]
            if (savedPos) {
              node.x = savedPos.x
              node.y = savedPos.y
              node.fx = savedPos.x
              node.fy = savedPos.y
            }
          })
        } catch (error) {
          console.error('Error restoring positions:', error)
        }
      }
    }

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        g.attr('transform', event.transform.toString())
      })
    svg.call(zoom)

    // Set initial zoom to be more zoomed out
    svg.call(zoom.transform, d3.zoomIdentity.scale(0.6).translate(width * 0.5, height * 0.4))

    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(edges)
        .id((d: GraphNode) => d.id)
        .distance((d: GraphLink) => {
          // Different distances for different types of connections
          if (d.source.isGroup && d.target.isGroup) {
            // Group to group connections
            return 180
          } else if (d.source.isGroup || d.target.isGroup) {
            // Group to link connections
            return 80
          } else {
            // Link to link connections
            return 120
          }
        })
        .strength(0.3))
      .force('charge', d3.forceManyBody().strength((d: d3.SimulationNodeDatum) => {
        // Groups have stronger repulsion
        const node = d as GraphNode
        return node.isGroup ? -300 : -100
      }))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.03))
      .force('collision', d3.forceCollide().radius((d: d3.SimulationNodeDatum) => {
        // Groups need more space
        const node = d as GraphNode
        return node.isGroup ? 120 : 80
      }))
      .force('x', d3.forceX((d: d3.SimulationNodeDatum) => {
        // Keep groups at their intended positions
        const node = d as GraphNode
        if (node.isGroup) return node.x || width / 2
        // Pull links towards their group's x position
        if (node.group) {
          const groupNode = nodes.find(n => n.id === node.group && n.isGroup)
          return groupNode ? (groupNode.x || width / 2) : width / 2
        }
        return width / 2
      }).strength(0.2))
      .force('y', d3.forceY((d: d3.SimulationNodeDatum) => {
        // Keep groups at their intended positions
        const node = d as GraphNode
        if (node.isGroup) return node.y || height / 2
        // Pull links towards their group's y position
        if (node.group) {
          const groupNode = nodes.find(n => n.id === node.group && n.isGroup)
          return groupNode ? (groupNode.y || height / 2) : height / 2
        }
        return height / 2
      }).strength(0.2))
      .force('groupRepulsion', () => {
        nodes.forEach((node, i) => {
          if (!node.isGroup) return
          
          nodes.forEach((otherNode, j) => {
            if (i === j || !otherNode.isGroup) return
            
            // Check if they are parent-child relationship
            const isParentChild = groups.some(g => 
              (g.id === node.id && g.parent_group_id === otherNode.id) ||
              (g.id === otherNode.id && g.parent_group_id === node.id)
            )
            
            const dx = (otherNode.x || 0) - (node.x || 0)
            const dy = (otherNode.y || 0) - (node.y || 0)
            const distance = Math.sqrt(dx * dx + dy * dy)
            
            // Different minimum distances for different relationships
            const minDistance = isParentChild ? 120 : 200
            
            if (distance < minDistance) {
              const force = (minDistance - distance) / distance
              const fx = dx * force * (isParentChild ? 0.1 : 0.2)
              const fy = dy * force * (isParentChild ? 0.1 : 0.2)
              
              if (node.vx !== undefined && node.vy !== undefined) {
                node.vx -= fx
                node.vy -= fy
              }
              if (otherNode.vx !== undefined && otherNode.vy !== undefined) {
                otherNode.vx += fx
                otherNode.vy += fy
              }
            }
          })
        })
      })
      .force('groupClustering', () => {
        // Keep links clustered around their groups
        nodes.forEach(node => {
          if (node.isGroup || !node.group) return
          
          const groupNode = nodes.find(n => n.id === node.group && n.isGroup)
          if (!groupNode) return
          
          const dx = (groupNode.x || 0) - (node.x || 0)
          const dy = (groupNode.y || 0) - (node.y || 0)
          const distance = Math.sqrt(dx * dx + dy * dy)
          const targetDistance = 70 // Desired distance from group center
          
          if (distance > targetDistance) {
            const force = (distance - targetDistance) / distance * 0.1
            const fx = dx * force
            const fy = dy * force
            
            if (node.vx !== undefined && node.vy !== undefined) {
              node.vx += fx
              node.vy += fy
            }
          }
        })
      })
      .force('bounding', () => {
        nodes.forEach(node => {
          const targetX = Math.max(80, Math.min(width - 80, node.x || 0))
          const targetY = Math.max(80, Math.min(height - 80, node.y || 0))
          node.x = node.x ? node.x + (targetX - node.x) * 0.1 : targetX
          node.y = node.y ? node.y + (targetY - node.y) * 0.1 : targetY
        })
      })
      .alphaDecay(0.15)
      .velocityDecay(0.95)
      .on('tick', () => {
        link
          .attr('d', (d: GraphLink) => {
            const sx = d.source.x || 0
            const sy = d.source.y || 0
            const tx = d.target.x || 0
            const ty = d.target.y || 0
            const mx = (sx + tx) / 2
            return `M${sx},${sy} Q${mx},${sy} ${tx},${ty}`
          })
        node
          .attr('transform', (d: GraphNode) => `translate(${d.x || 0},${d.y || 0})`)
      })

    simulationRef.current = simulation
    nodesRef.current = nodes
    simulation.alpha(0.3).restart()

    let alphaTarget = 0.3
    const alphaInterval = setInterval(() => {
      if (alphaTarget < 1) {
        alphaTarget += 0.35
        simulation.alpha(alphaTarget)
      } else {
        clearInterval(alphaInterval)
      }
    }, 25)

    const link = g.append('g')
      .selectAll<SVGPathElement, GraphLink>('path')
      .data(edges)
      .join('path')
      .attr('class', 'graph-link')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0)
      .attr('fill', 'none')
      .on('mouseover', function(this: SVGPathElement) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-opacity', 1)
          .attr('stroke-width', 2)
      })
      .on('mouseout', function(this: SVGPathElement) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', 1.5)
      })

    link.transition()
      .duration(700)
      .attr('stroke-opacity', 0.6)

    const node = g.append('g')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('class', d => d.isGroup ? 'graph-node group-node' : 'graph-node')
      .attr('transform', (d: GraphNode) => `translate(${d.x || 0},${d.y || 0})`)
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    const nodeContent = node.append('g')
      .attr('class', 'node-content')
      .attr('transform', 'scale(1)')

    const createHexagonPoints = (size: number) => {
      const points = []
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3
        const x = size * Math.cos(angle)
        const y = size * Math.sin(angle)
        points.push(`${x},${y}`)
      }
      return points.join(' ')
    }

    nodeContent.append('polygon')
      .attr('points', (d: GraphNode) => {
        const size = d.isGroup ? 32 : notes.some(n => n.id === d.id) ? 10 : d.id.startsWith('alert-') ? 12 : 24
        return createHexagonPoints(size)
      })
      .attr('fill', (d: GraphNode) => {
        if (d.isGroup) return d.color || '#888'
        if (notes.some(n => n.id === d.id)) return '#fbbf24'
        if (d.id.startsWith('alert-')) return '#ef4444'
        return d.color || '#94a3b8'
      })
      .attr('stroke', (d: GraphNode) => {
        if (highlightedNodesRef.current.has(d.id)) return '#00ff00'  // Green highlight stroke
        return '#fff'
      })
      .attr('stroke-width', (d: GraphNode) => {
        if (highlightedNodesRef.current.has(d.id)) return d.isGroup ? 5 : 4  // Thicker stroke for highlighted nodes
        return d.isGroup ? 3 : 2
      })
      .attr('stroke-opacity', (d: GraphNode) => {
        if (highlightedNodesRef.current.has(d.id)) return 1  // Full opacity for highlighted nodes
        return 0.8
      })
      .attr('class', d => `node-hexagon ${selectedNodeId === d.id ? 'selected' : ''} ${highlightedNodesRef.current.has(d.id) ? 'highlighted' : ''}`)
      .style('filter', (d: GraphNode) => {
        if (highlightedNodesRef.current.has(d.id)) return 'drop-shadow(0 0 8px #00ff00)'  // Glow effect for highlighted nodes
        return 'none'
      })

    nodeContent.append('text')
      .text((d: GraphNode) => {
        if (d.id.startsWith('alert-')) {
          // For alert nodes, show date and time on separate lines
          return d.title.split('\n')[0] // Show date first
        }
        return d.isGroup ? d.title : d.title
      })
      .attr('text-anchor', 'middle')
      .attr('dy', (d: GraphNode) => d.isGroup ? 48 : d.id.startsWith('alert-') ? 32 : 40)
      .attr('fill', '#ffffff')
      .style('font-weight', (d: GraphNode) => d.isGroup ? 'bold' : 'normal')
      .style('font-size', (d: GraphNode) => d.id.startsWith('alert-') ? '18px' : '12px')
      .style('pointer-events', 'none')
      .style('padding', (d: GraphNode) => d.id.startsWith('alert-') ? '12px' : '0')

    // Add second line for alert nodes (time)
    nodeContent.filter(d => d.id.startsWith('alert-'))
      .append('text')
      .text((d: GraphNode) => d.title.split('\n')[1] || '') // Show time on second line
      .attr('text-anchor', 'middle')
      .attr('dy', 42)
      .attr('fill', '#ffffff')
      .style('font-size', '18px')
      .style('pointer-events', 'none')
      .style('padding', '12px')

    nodeContent.filter(d => notes.some(n => n.id === d.id))
      .append('text')
      .text((d: GraphNode) => {
        const note = notes.find(n => n.id === d.id)
        return note ? note.title.charAt(0).toUpperCase() : ''
      })
      .attr('x', 14)
      .attr('y', 4)
      .attr('fill', '#ffffff')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')



    // Helper function to handle single-selection toggle behavior
    const handleSingleNodeSelection = (event: MouseEvent, d: GraphNode, isNote: boolean = false) => {
      event.stopPropagation()
      
      // Check if this node is already highlighted
      const isCurrentlyHighlighted = highlightedNodesRef.current.has(d.id)
      
      if (isCurrentlyHighlighted) {
        // If clicking the same highlighted node, remove highlight
        highlightedNodesRef.current.delete(d.id)
        
        // Update visual styling for this node
        d3.select(event.currentTarget as SVGGElement)
          .select('polygon')
          .transition()
          .duration(300)
          .attr('stroke', '#fff')
          .attr('stroke-width', d.isGroup ? 3 : 2)
          .attr('stroke-opacity', 0.8)
          .style('filter', 'none')
          
        setSelectedNodeId(null)
        if (isNote) {
          setSelectedNote(null)
          setTooltipPos(null)
        }
        d3.select(event.currentTarget as SVGGElement)
          .select('.node-content')
          .transition()
          .duration(200)
          .attr('transform', 'scale(1)')
      } else {
        // Clear all existing highlights first (single selection)
        const previouslyHighlighted = Array.from(highlightedNodesRef.current)
        highlightedNodesRef.current.clear()
        
        // Reset styling for all previously highlighted nodes
        previouslyHighlighted.forEach(nodeId => {
          d3.selectAll('.graph-node')
            .filter((n: any) => n.id === nodeId)
            .select('polygon')
            .transition()
            .duration(300)
            .attr('stroke', '#fff')
            .attr('stroke-width', (n: any) => n.isGroup ? 3 : 2)
            .attr('stroke-opacity', 0.8)
            .style('filter', 'none')
            
          d3.selectAll('.graph-node')
            .filter((n: any) => n.id === nodeId)
            .select('.node-content')
            .transition()
            .duration(200)
            .attr('transform', 'scale(1)')
        })
        
        // Highlight the new node
        highlightedNodesRef.current.add(d.id)
        
        // Update visual styling for the new highlighted node
        d3.select(event.currentTarget as SVGGElement)
          .select('polygon')
          .transition()
          .duration(300)
          .attr('stroke', '#00ff00')
          .attr('stroke-width', d.isGroup ? 5 : 4)
          .attr('stroke-opacity', 1)
          .style('filter', 'drop-shadow(0 0 8px #00ff00)')
        
        setSelectedNodeId(d.id)
        if (isNote) {
          setSelectedNote(notes.find(n => n.id === d.id))
          setTooltipPos({ x: d.x || 0, y: d.y || 0 })
        }
        d3.select(event.currentTarget as SVGGElement)
          .select('.node-content')
          .transition()
          .duration(200)
          .attr('transform', 'scale(1.1)')
      }
    }

    node.filter(d => notes.some(n => n.id === d.id)).on('click', (event: MouseEvent, d: GraphNode) => {
      handleSingleNodeSelection(event, d, true)
      // Call the callback to show the modal
      onNoteNodeClick?.(d.id)
    })

    node.filter((d: GraphNode) => d.isGroup === true).on('click', (event: MouseEvent, d: GraphNode) => {
      handleSingleNodeSelection(event, d, false)
      onGroupNodeClick?.(d.id)
    })

    function dragstarted(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) {
        simulation.alphaTarget(0.3).restart()
      }
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
      simulation.velocityDecay(0.99)
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
      simulation.velocityDecay(0.99)
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, GraphNode, GraphNode>) {
      if (!event.active) {
        simulation.alphaTarget(0)
      }
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
      simulation.alpha(0)
      simulation.velocityDecay(0.99)
    }

    let selectedConnectionNode: string | null = null
    node.filter(d => !d.isGroup && !notes.some(n => n.id === d.id)).on('click', async (event: MouseEvent, d: GraphNode) => {
      event.stopPropagation()
      if (selectedConnectionNode) {
        if (selectedConnectionNode !== d.id) {
          try {
            await onAddConnection(selectedConnectionNode, d.id)
            d3.selectAll('.graph-node polygon')
              .transition()
              .duration(200)
              .attr('stroke', '#fff')
              .attr('stroke-width', 2)
            selectedConnectionNode = null
            setSelectedNodeId(null)
            simulation.alpha(0)
            simulation.velocityDecay(0.99)
          } catch (error) {
            console.error('Error adding connection:', error)
            selectedConnectionNode = null
            setSelectedNodeId(null)
          }
        }
      } else {
        handleSingleNodeSelection(event, d, false)
        onLinkNodeClick?.(d.id)
      }
    })

    d3.select(svgRef.current).on('click', () => {
      setSelectedNote(null)
      setTooltipPos(null)
      setSelectedNodeId(null)
      highlightedNodesRef.current.clear() // Clear all highlights
      
      // Reset all node styling
      d3.selectAll('.node-content')
        .transition()
        .duration(200)
        .attr('transform', 'scale(1)')
      
      d3.selectAll('.graph-node polygon')
        .transition()
        .duration(300)
        .attr('stroke', '#fff')
        .attr('stroke-width', (d: any) => d.isGroup ? 3 : 2)
        .attr('stroke-opacity', 0.8)
        .style('filter', 'none')
        
      simulation.alpha(0)
      simulation.velocityDecay(0.99)
    })

    const linkForce = simulation.force('link') as d3.ForceLink<GraphNode, GraphLink> | undefined
    if (linkForce) {
      linkForce.strength(0.08).distance(120)
    }
    const chargeForce = simulation.force('charge') as d3.ForceManyBody<GraphNode> | undefined
    if (chargeForce) {
      chargeForce.strength(-80)
    }
    const collideForce = simulation.force('collision') as d3.ForceCollide<GraphNode> | undefined
    if (collideForce) {
      collideForce.radius(80)
    }

    const stopMovement = () => {
      simulation.alpha(0)
      simulation.velocityDecay(0.99)
    }

    const stopInterval = setTimeout(() => {
      stopMovement()
    }, 1500)

    // Add instruction text
    svg.append('text')
      .attr('x', 20)
      .attr('y', height - 40)
      .attr('fill', '#94a3b8')
      .style('font-size', '12px')
      .text('Click nodes to highlight • Click background to clear highlights')
    
    // Add save button to the SVG
    const saveButton = svg.append('g')
      .attr('class', 'save-button')
      .attr('transform', `translate(${width - 100}, 20)`)
      .style('cursor', canEdit ? 'pointer' : 'not-allowed')
      .style('opacity', canEdit ? 1 : 0.5)
      .on('click', () => {
        if (canEdit) {
          handleSavePositions()
        } else {
          console.log('🚫 Save blocked: NFT ownership required')
        }
      })

    saveButton.append('rect')
      .attr('width', 80)
      .attr('height', 30)
      .attr('rx', 5)
      .attr('fill', canEdit ? (saveAnimation ? '#10b981' : '#3b82f6') : '#94a3b8')
      .attr('opacity', 0.9)
      .transition()
      .duration(300)
      .attr('fill', canEdit ? (saveAnimation ? '#10b981' : '#3b82f6') : '#94a3b8')

    saveButton.append('text')
      .attr('x', 40)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .text(canEdit 
        ? (saveAnimation ? 'Saved!' : (isSaving ? 'Saving...' : 'Save Map'))
        : 'NFT Required'
      )
      .transition()
      .duration(300)
      .text(canEdit 
        ? (saveAnimation ? 'Saved!' : (isSaving ? 'Saving...' : 'Save Map'))
        : 'NFT Required'
      )

    return () => {
      clearInterval(alphaInterval)
      clearTimeout(stopInterval)
      if (simulationRef.current) {
        simulationRef.current.stop()
        simulationRef.current = null
      }
      d3.select(svgRef.current).select('.save-button').remove()
    }
  }, [links, groups, networkConnections, notes, emailAlerts, isSaving, activeProfile, profilePositions, canEdit, saveAnimation])

  React.useEffect(() => { setCustomTooltipPos(null) }, [selectedNote])

  // Add save positions function
  const handleSavePositions = async () => {
    if (!onSavePositions || isSaving) return
    
    setIsSaving(true)
    setSaveAnimation(true)
    try {
      const positions: { [key: string]: { x: number; y: number } } = {}
      nodesRef.current.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          positions[node.id] = { x: node.x, y: node.y }
        }
      })
      await onSavePositions(positions)
      
      // Reset animation after 1.5 seconds
      setTimeout(() => {
        setSaveAnimation(false)
      }, 1500)
    } catch (error) {
      console.error('Error saving positions:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div style={{ position: 'relative', width: '600px', height: '600px' }}>
      <svg 
        ref={svgRef} 
        className="graph-svg"
        width={600}
        height={600}
        style={{ display: 'block' }}
      />
      <style>
        {`
          .node-hexagon.selected {
            stroke: #3b82f6 !important;
            stroke-width: 3px !important;
          }
          .graph-node {
            transition: transform 0.2s ease-out;
          }
          .save-button:hover rect {
            opacity: 1 !important;
          }
          .save-button text {
            font-size: 12px;
            font-weight: 500;
            user-select: none;
          }
          @keyframes savePulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          .save-button.saved rect {
            animation: savePulse 0.3s ease-in-out;
          }
        `}
      </style>
      {selectedNote && (customTooltipPos || tooltipPos) && (
        <div
          className="note-tooltip"
          style={{
            position: 'absolute',
            left: (customTooltipPos ? customTooltipPos.x : tooltipPos!.x),
            top: (customTooltipPos ? customTooltipPos.y : tooltipPos!.y - 56),
            transform: 'translateX(-50%)',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            padding: '6px 10px',
            zIndex: 10,
            minWidth: 120,
            maxWidth: 200,
            fontSize: '12px',
            pointerEvents: 'auto',
            cursor: isDragging ? 'grabbing' : 'default',
          }}
        >
          <div
            style={{ fontWeight: 600, marginBottom: 2, color: '#222', cursor: 'grab', userSelect: 'none' }}
            onMouseDown={handleTooltipMouseDown}
          >
            {selectedNote.title}
          </div>
          <div style={{ color: '#888', marginBottom: 2, fontSize: '11px', wordBreak: 'break-word' }}>{selectedNote.description}</div>
          {selectedNote.group_id && <div style={{ color: '#3b82f6' }}>Group: {groups.find(g => g.id === selectedNote.group_id)?.name || selectedNote.group_id}</div>}
          {selectedNote.link_id && <div style={{ color: '#6366f1' }}>Link: {links.find(l => l.id === selectedNote.link_id)?.title || selectedNote.link_id}</div>}
          <button style={{ marginTop: 4, fontSize: '11px', padding: '2px 8px' }} onClick={() => { setSelectedNote(null); setTooltipPos(null); setCustomTooltipPos(null); }}>Close</button>
        </div>
      )}
    </div>
  )
} 