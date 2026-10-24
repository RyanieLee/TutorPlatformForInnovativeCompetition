import {createDemoGateway} from '../../../gateway.mjs'
const handle=createDemoGateway()
export function onRequest(context){return handle(context)}
