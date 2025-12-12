import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ClassroomBooking from "./ClassroomBooking.jsx";
import Login from "./Login.jsx";
import EditingClassroom from "./EditingClassroom.jsx";
import BlacklistPage from "./BlacklistPage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<ClassroomBooking />} />
      <Route path="/login" element={<Login />} />
      <Route path="/editing-classroom" element={<EditingClassroom />} />
      <Route path="/blacklist" element={<BlacklistPage />} />
      <Route path="/profile" element={<ProfilePage />} />
    </Routes>
  </BrowserRouter>
);
