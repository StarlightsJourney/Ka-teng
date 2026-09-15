export type PersonId = string
export type FamilyId = string
export type Gender = 'M' | 'F' | 'X' | 'U'

export type PersonName = {
  first: string
  last: string
  chinese?: string
  pinyin?: string
}

export type Person = {
  id: PersonId
  name: PersonName
  gender: Gender
  birth?: string
  death?: string
  birthDate?: string
  deathDate?: string
  deceased?: boolean
  restingPlace?: string
  altNames?: string[]
  bio?: string
  avatar?: string
  parents?: PersonId[]
  spouses?: PersonId[]
  children?: PersonId[]
}

export type Family = {
  id: FamilyId
  parents: PersonId[]
  children: PersonId[]
}

export type PersonMap = ReadonlyMap<PersonId, Person>
