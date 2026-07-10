import { Home } from "./components/Home"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import { Login } from "./components/Login";
import { Register } from "./components/Register";

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
  }
]);

export const App = () => {
  return <RouterProvider router={router} />;
}