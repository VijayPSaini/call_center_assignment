import {Router} from 'express'
import { customer_join ,customer_join_room} from '../controller/customer'

const route = Router()

route.post('/join',customer_join)
route.post('/start-recording',customer_join_room)


export default route