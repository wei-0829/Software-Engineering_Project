import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ClassroomBooking from "./ClassroomBooking.jsx";
import Login from "./Login.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ClassroomBooking />} />
      <Route path="/login" element={<Login />} />
    </Routes>
  </BrowserRouter>
);
