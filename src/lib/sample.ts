import type { Book, LinkKind } from '../types'
import { createBook, createGroup, createLink, createNode } from './factory'

/** A small public-domain example so the web isn't empty on first visit. */
export function createSampleBook(): Book {
  const book = createBook('Pride and Prejudice', 'Jane Austen')
  book.pattern = 'stripes'

  const c = (name: string, role: string, firstSeen: string, mark: string, x: number, y: number) =>
    createNode('character', { x, y }, { name, role, firstSeen, mark })
  const p = (name: string, role: string, firstSeen: string, x: number, y: number) =>
    createNode('place', { x, y }, { name, role, firstSeen })

  const elizabeth = c('Elizabeth Bennet', 'Second Bennet daughter, sharp-witted', 'Ch. 1', 'solid', 0, 0)
  const jane = c('Jane Bennet', 'Eldest sister, kind to a fault', 'Ch. 1', 'dots', -320, -40)
  const darcy = c('Mr. Darcy', 'Proud, wealthy, hard to read', 'Ch. 3', 'solid', 340, -30)
  const bingley = c('Mr. Bingley', 'Cheerful new neighbour', 'Ch. 1', 'stripes', 60, -220)
  const wickham = c('Mr. Wickham', 'Charming officer', 'Ch. 15', 'hatch', 420, 200)
  const collins = c('Mr. Collins', 'Pompous cousin, a clergyman', 'Ch. 13', 'outline', -520, 260)
  const charlotte = c('Charlotte Lucas', "Lizzy's practical best friend", 'Ch. 5', 'half', -160, 300)
  const catherine = c('Lady Catherine de Bourgh', "Darcy's imperious aunt", 'Ch. 13', 'dots', 180, 470)

  const longbourn = p('Longbourn', 'Bennet family home', 'Ch. 1', -200, -200)
  const netherfield = p('Netherfield', 'Estate Bingley rents', 'Ch. 1', 320, -230)
  const pemberley = p('Pemberley', "Darcy's estate in Derbyshire", 'Ch. 16', 680, 40)
  const rosings = p('Rosings Park', "Lady Catherine's estate", 'Ch. 13', -220, 560)

  // Groups: drawn as outlines around their members on the web.
  const bennets = createGroup('The Bennet sisters', { style: 'hatch' })
  const netherfieldParty = createGroup('Netherfield party', { style: 'dots' })
  book.groups = [bennets, netherfieldParty]
  elizabeth.groupId = bennets.id
  jane.groupId = bennets.id
  bingley.groupId = netherfieldParty.id
  darcy.groupId = netherfieldParty.id

  book.nodes = [elizabeth, jane, darcy, bingley, wickham, collins, charlotte, catherine, longbourn, netherfield, pemberley, rosings]

  const l = (a: { id: string }, b: { id: string }, kind: LinkKind, label: string, notes = '') =>
    createLink(a.id, b.id, kind, label, notes)

  book.links = [
    l(elizabeth, jane, 'family', 'sisters', 'Closest of the five Bennet sisters.'),
    l(elizabeth, darcy, 'rival', "it's complicated", 'Off to a terrible start at the Meryton ball.'),
    l(jane, bingley, 'romance', 'smitten'),
    l(darcy, bingley, 'friend', 'close friends'),
    l(darcy, wickham, 'enemy', 'bitter history', 'Grew up together at Pemberley. Something went wrong.'),
    l(elizabeth, charlotte, 'friend', 'best friends'),
    l(collins, charlotte, 'romance', 'married'),
    l(collins, catherine, 'work', 'his patroness'),
    l(catherine, darcy, 'family', 'aunt'),
    l(elizabeth, longbourn, 'place', 'lives here'),
    l(jane, longbourn, 'place', 'lives here'),
    l(bingley, netherfield, 'place', 'rents it'),
    l(darcy, pemberley, 'place', 'his estate'),
    l(catherine, rosings, 'place', 'her estate'),
  ]
  return book
}
