
import passport from 'passport';
import { Request } from 'express';
import {Strategy as GoogleStrategy} from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { config } from './app.config';
import { NotFoundException } from '../utils/appError';
import { ProviderEnum } from '../enums/account-provider.enum';
import { loginOrCreateAccountService,verifyUserService } from '../services/auth.service';


passport.use(
    new GoogleStrategy (
        {
            clientID: config.GOOGLE_CLIENT_ID,
            clientSecret: config.GOOGLE_CLIENT_SECRET,
            callbackURL: config.GOOGLE_CALLBACK_URL,
            scope : ["profile","email"],
            passReqToCallback:true
        },
        async(req:Request,accessToken,refreshToken,profile,done)=>{
            console.log("profile is config: ",profile);
            try{
                const {email,sub:googleId,picture} = profile._json; 
                
                if(!googleId){
                    throw new NotFoundException("Google ID not found");      
                }

                const {user} = await loginOrCreateAccountService({
                    provider : ProviderEnum.GOOGLE,
                    displayName : profile.displayName,
                    providerId : googleId,
                    email : email,
                    picture:picture
                })

                done(null,user)
            }catch(error){
                console.log("error during google login: ",error)  
                done(error,false)
            }
        }
    )
)


passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
        session: true,
      },
      async (email, password, done) => {
        try {
          const user = await verifyUserService({ email, password });
          return done(null, user);
        } catch (error: any) {
          return done(error, false, { message: error?.message });
        }
      }
    )
);


passport.serializeUser((user:any, done) => done(null,user));

passport.deserializeUser((user:any, done) => done(null,user));