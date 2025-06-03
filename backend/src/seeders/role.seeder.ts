import "dotenv/config";
import mongoose from "mongoose";
import connectDatabase from "../config/database.config";
import RoleModel from "../models/roles-permission.model";
import { RolePermissions } from "../utils/role-permission";

const seedRoles = async () => {
    console.log("seeding roles started");
    await connectDatabase();
    const session = await mongoose.startSession(); 
    try{
        session.startTransaction();

        console.log("clearing existing data")
        await RoleModel.deleteMany({},{session});

        for(const roleName in RolePermissions){
            const role = roleName as keyof typeof RolePermissions;
            const permissions = RolePermissions[role];

            const existingRole = await RoleModel.findOne({name: role}).session(session);
            if(!existingRole){
                const newRole = new RoleModel({name: role, permissions});
                await newRole.save({session});
                console.log(`role ${role} added with permissions ${permissions} seeded successfully`);
            }else{
                console.log(`role ${role} already exists with permissions ${permissions}`);
            }
        }

        await session.commitTransaction();
        console.log("transaction committed");
        session.endSession();
        console.log("session ended");

        console.log("seeding completed successfully");
    }catch(error){
        await session.abortTransaction();
        console.error(`seeding failed with error: ${error}`);
        process.exit(1);
    }finally{
        await mongoose.disconnect();
    }
}  

seedRoles().catch((error) => console.error(`seeding failed with error: ${error}`));