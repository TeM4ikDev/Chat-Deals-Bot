import React from "react";
import { Outlet } from "react-router-dom";

const AdminPage: React.FC = () => {
    return (
        <div>
            <Outlet />
        </div>
    );
};

export default AdminPage;
