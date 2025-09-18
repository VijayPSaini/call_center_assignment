import { Request,Response } from "express";
import { stat } from "fs";


export const sendErrorResponse=(res:Response,statusCode:number,message:string)=>{
    return res.status(statusCode).json({status:statusCode,message:message});
}
export const sendSuccessResponse=(res:Response,statusCode:number,data:any,message:string)=>{
    return res.status(statusCode).json({status:statusCode,data:data,message:message});
}