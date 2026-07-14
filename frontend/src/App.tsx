import { Home } from "./components/Home"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import User from "./Dashboard/User";
import Teacher from "./Dashboard/Teacher";
import DemoCredentials from "./components/DemoCredentials";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />
  },
  {
    path: "/student-dashboard",
    element: <User />
  },
  {
    path: "/teacher-dashboard",
    element: <Teacher />
  },
   {
    path: "/demo",
    element: <DemoCredentials />
  }

]);

export const App = () => {
  return <RouterProvider router={router} />;
}