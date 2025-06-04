import { Request,Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { config } from "../config/app.config";


export const googleLoginCallback = asyncHandler(
    async(req:Request,res:Response) => {
        const currentWorkspace = req.user?.currentWorkspace;

        if(!currentWorkspace){
            return res.redirect(`${config.FRONTEND_GOOGLE_CALLBACK_URL}?status=failure`)
        }

        return res.redirect(`${config.FRONTEND_ORIGIN}/workspace/${currentWorkspace}`)

    }
)