import {Router} from 'express'
import { agent_register,agentAcceptCall,agentRejectCall,agent_statusUpdate,agent_transfer_call } from '../controller/agent'
const route = Router()

route.post('/join',agent_register)
route.post('/accept-call',agentAcceptCall)
route.post('/reject-call',agentRejectCall)
route.post('/status-update',agent_statusUpdate)

route.post('/transfer-call',agent_transfer_call)
export default route