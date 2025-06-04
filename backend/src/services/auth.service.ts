import mongoose from "mongoose"
import UserModel from "../models/user.model"
import AccountModel from "../models/account.model"
import WorkspaceModel from "../models/workspace.model"
import RoleModel from "../models/roles-permission.model"
import { Roles } from "../enums/role.enum"
import { BadRequestException, NotFoundException, UnauthorizedException } from "../utils/appError"
import MemberModel from "../models/member.model"
import { ProviderEnum } from "../enums/account-provider.enum"

export const loginOrCreateAccountService = async (data : {
    provider : string,
    displayName : string,
    providerId : string,
    email ?: string,
    picture ?: string
}) => {
    const {displayName,provider,providerId,email,picture} = data
    
    //because we have multiple actions to perform it is good to use transaction
    const session = await mongoose.startSession()
    try{
        session.startTransaction();
        console.log("session started successfully");


        let user = await UserModel.findOne({email}).session(session);

        if(!user){
            // user does not find we have to create a user
            console.log("start with creating user...")
            user = new UserModel({
                email,
                name : displayName,
                profilePicture : picture || null
            })

            await user.save({session})

            console.log("user created successfully...")

            console.log("start creating account session")

            const account = new AccountModel({
                provider,
                providerId,
                userId : user._id
            })

            await account.save({session})

            console.log("account created successfully...")

            console.log("start with creating a workspace for the user: ")

            const workspace = new WorkspaceModel({
                name : `My workspace`,
                description : `workspace created for ${user.name}`,
                owner : user._id,
            })

            await workspace.save({session})

            console.log("workspace created successfully...")

            const ownerRole = await RoleModel.findOne({
                name : Roles.OWNER
            }).session(session)

            if(!ownerRole){
                throw new NotFoundException("Owner role not found")
            }

            console.log("started creating memmber for the workspace")

            const member = new MemberModel({
                userId : user._id,
                workspaceId : workspace._id,
                role : ownerRole._id,
                joinedAt: new Date()
            })

            await member.save({session})

            console.log("member created successfully...")

            //set the current workspace id to user
            user.currentWorkspace = workspace._id as mongoose.Types.ObjectId

            await user.save({session})
        }

        await session.commitTransaction();

        session.endSession()

        console.log("session ended successfully")

        return {user}

    }catch(error){
        await session.abortTransaction();
        session.endSession()
        throw error
    }finally{
        session.endSession()
    }
}


export const registerUserService = async (body: {
    email: string;
    name: string;
    password: string;
  }) => {
    const { email, name, password } = body;
    const session = await mongoose.startSession();
  
    try {
      session.startTransaction();
  
      const existingUser = await UserModel.findOne({ email }).session(session);
      if (existingUser) {
        throw new BadRequestException("Email already exists");
      }
  
      const user = new UserModel({
        email,
        name,
        password,
      });
      await user.save({ session });
  
      const account = new AccountModel({
        userId: user._id,
        provider: ProviderEnum.EMAIL,
        providerId: email,
      });

      await account.save({ session });
  
      // 3. Create a new workspace for the new user
      const workspace = new WorkspaceModel({
        name: `My Workspace`,
        description: `Workspace created for ${user.name}`,
        owner: user._id,
      });

      await workspace.save({ session });
  
      const ownerRole = await RoleModel.findOne({
        name: Roles.OWNER,
      }).session(session);
  
      if (!ownerRole) {
        throw new NotFoundException("Owner role not found");
      }
  
      const member = new MemberModel({
        userId: user._id,
        workspaceId: workspace._id,
        role: ownerRole._id,
        joinedAt: new Date(),
      });
      await member.save({ session });
  
      user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
      await user.save({ session });
  
      await session.commitTransaction();
      session.endSession();
      console.log("End Session...");
  
      return {
        userId: user._id,
        workspaceId: workspace._id,
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
  
      throw error;
    }
};
  

export const verifyUserService = async ({
    email,
    password,
    provider = ProviderEnum.EMAIL,
  }: {
    email: string;
    password: string;
    provider?: string;
  }) => {
    const account = await AccountModel.findOne({ provider, providerId: email });
    if (!account) {
      throw new NotFoundException("Invalid email or password");
    }
  
    const user = await UserModel.findById(account.userId);
  
    if (!user) {
      throw new NotFoundException("User not found for the given account");
    }
  
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UnauthorizedException("Invalid email or password");
    }
  
    return user.omitPassword();
};

