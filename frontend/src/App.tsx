import { Home } from "./components/Home";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import User from "./Dashboard/User";
import Teacher from "./Dashboard/Teacher";
import DemoCredentials from "./components/DemoCredentials";
import { AnimatedGridBackground } from "./components/AnimatedGridBackground";
import InteractiveGridDemo from "./components/ui/demo";

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
    element: <Register />,
  },
  {
    path: "/student-dashboard",
    element: <User />,
  },
  {
    path: "/teacher-dashboard",
    element: <Teacher />,
  },
  {
    path: "/demo",
    element: <DemoCredentials />,
  },
  {
    path: "/grid-demo",
    element: <InteractiveGridDemo />,
  },
]);

export const App = () => {
  return (
    <div className="relative min-h-screen bg-white">
      {/* Global Interactive Grid Background (Light Mode) */}
      <AnimatedGridBackground />
      
      {/* Route content mounted above the background */}
      <div className="relative z-10">
        <RouterProvider router={router} />
      </div>
    </div>
  );
};

export default App;
