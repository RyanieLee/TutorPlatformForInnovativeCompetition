import { z } from 'zod'
import places from './content/xian-places.json'
export const areaLabelSchema=z.enum(places.map(p=>p.label) as [string,...string[]])
