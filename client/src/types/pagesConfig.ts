import { createAxiosInstance } from "@/api/axios.api";
import { useMemo } from "react";






class ApiConfig {
    auth = {
        baseInstance: createAxiosInstance('auth/'),

        profile: "profile",
        login: "login",
    }

    admin = {
        baseInstance: createAxiosInstance('admin/'),

        garants: {
            main: '/garants'
        },

        scamforms:{
            main: 'scamforms'
        },

        users: {
            main: "users",
            updateRole: "users/update-role",
            updateBanned: "users/update-banned",
        },
     
    }

    users = {
        baseInstance: createAxiosInstance('users/'),

        updateConfig: 'updateProfitConfig',

        deals: 'deals'

    }
}


export const apiConfig = new ApiConfig()

