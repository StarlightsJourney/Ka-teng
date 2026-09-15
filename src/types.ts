export type RelationMap = {
  father?: string
  mother?: string
  parents?: string[]
  spouses?: string[]
  children?: string[]
}

export type PersonData = {
  'first name'?: string
  'last name'?: string
  gender?: string
  birthday?: string
  avatar?: string
  label?: string
  [key: string]: unknown
}

export type Person = {
  id: string
  data: PersonData
  rels: RelationMap
}

export type GraphNode = {
  id: string
  name: string
  group: string
  gender?: string
  x?: number
  y?: number
  z?: number
  vx?: number
  vy?: number
  vz?: number
}

export type GraphLink = {
  source: string
  target: string
  kind: 'parent' | 'spouse'
}

export type FamilyGraph = {
  nodes: GraphNode[]
  links: GraphLink[]
}
