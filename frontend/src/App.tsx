import { Home } from "./components/Home"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import User from "./Dashboard/User";
import Teacher from "./Dashboard/Teacher";

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
  }

]);

export const App = () => {
  return <RouterProvider router={router} />;
}