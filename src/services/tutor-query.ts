import type { TutorQuery } from './contracts'
/** 仅转译价格输入；服务端仍独立校验，空字段不等于零。 */
export function parsePriceRange(minText: string, maxText: string): Pick<TutorQuery, 'minPrice' | 'maxPrice'> {
  const parse = (text: string): number | undefined => {
    if (!text.trim()) return undefined
    if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(text.trim()) || Number(text) > 2000) throw new Error('价格请输入 0–2000 元，最多两位小数')
    return Number(text)
  }
  const minPrice=parse(minText),maxPrice=parse(maxText)
  if(minPrice!==undefined && maxPrice!==undefined && minPrice>maxPrice)throw new Error('最低价格不能高于最高价格')
  return {minPrice,maxPrice}
}
