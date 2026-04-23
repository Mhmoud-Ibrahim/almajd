import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/appError";



export  const validate = (schema:any) => {
  return (req: Request, res: Response, next: NextFunction)=>{
    let {error} = schema.validate(req.body,{abortEarly:false})
    if(!error){
      next()
    }else{
        let errMsg = error.details.map((err:any) => err.message)
        next(new AppError(errMsg,400))
    }
  }
};

export const validation = (Schema: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
        let filter = { ...req.body, ...req.params, ...req.query };
        if (req.file) {
            filter.image = req.file;
        } 
        if (req.files) {
            filter = { ...filter, ...req.files };
        }

        const { error } = Schema.validate(filter, { abortEarly: false });
        
        if (!error) {
            next();
        } else {
            let errorList = error.details.map((val: any) => val.message);
            next(new AppError(errorList as any, 400));
        }
    }
}
