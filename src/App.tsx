import { useState, useEffect } from "react"; // இதைச் சேர்த்துள்ளேன்
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import WebView from "./pages/WebView";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminHome from "./pages/Admin/Home";
import Classes from "./pages/Admin/Classes";
import Students from "./pages/Admin/Students";
import BulkDocuments from "./pages/Admin/BulkDocuments";
import PromoteStudents from "./pages/Admin/PromoteStudents";
import Homework from "./pages/Admin/Homework";
import Fees from "./pages/Admin/Fees";
import FeeDefaulters from "./pages/Admin/FeeDefaulters";
import CollectFee from "./pages/Admin/CollectFee";
import Settings from "./pages/Admin/Settings";
import Courses from "./pages/Admin/Courses";
import CourseMaterials from "./pages/Admin/CourseMaterials";
import TermExam from "./pages/Admin/TermExam";
import LiveClasses from "./pages/Admin/LiveClasses";
import Youtube from "./pages/Admin/Youtube";
import Attendances from "./pages/Admin/Attendances";
import Staffs from "./pages/Admin/Staffs";
import Subjects from "./pages/Admin/Subjects";
import Timetable from "./pages/Admin/Timetable";
import Accounts from "./pages/Admin/Accounts";
import AddEmployee from "./pages/Admin/AddEmployee";
import ManageStaffLogin from "./pages/Admin/ManageStaffLogin";
import StaffWorkSubmissions from "./pages/Admin/StaffWorkSubmissions";
import Salary from "./pages/Admin/Salary";
import AddIncomeExpense from "./pages/Admin/AddIncomeExpense";
import AccountStatement from "./pages/Admin/AccountStatement";
import StudentFeeStatement from "./pages/Admin/StudentFeeStatement";
import ExamMarks from "./pages/Admin/ExamMarks";
import GradePerformanceDashboard from "./pages/Admin/GradePerformanceDashboard";
import ExamSettings from "./pages/Admin/ExamSettings";
import ApprovePassword from "./pages/Admin/ApprovePassword";
import WhatsApp from "./pages/Admin/WhatsApp";
import Announcements from "./pages/Admin/Announcements";
import LiveChat from "./pages/Admin/LiveChat";
import ChatbotSettings from "./pages/Admin/ChatbotSettings";
import Behaviour from "./pages/Admin/Behaviour";
import QuestionPaper from "./pages/Admin/QuestionPaper";
import HomePageSettings from "./pages/Admin/HomePageSettings";
import Forms from "./pages/Admin/Forms";
import PublicForm from "./pages/PublicForm";
import PublicExamPortal from "./pages/PublicExamPortal";
import ResetPassword from "./pages/ResetPassword";
import StudentDashboard from "./pages/Student/Dashboard";
import StaffDashboard from "./pages/Staff/Dashboard";
import OurStory from "./pages/OurStory";
import Careers from "./pages/Careers";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { initDB } from "./lib/db";

// Initialize mock database
initDB();

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/webview" element={<WebView />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/student-dashboard" element={<StudentDashboard />} />
        <Route path="/staff-dashboard" element={<StaffDashboard />} />
        <Route path="/our-story" element={<OurStory />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/form/:id" element={<PublicForm />} />
        <Route path="/forms/:id" element={<PublicForm />} />
        <Route path="/exam/:id" element={<PublicExamPortal />} />
        <Route path="/exams/:id" element={<PublicExamPortal />} />

        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<AdminHome />} />
          <Route path="forms" element={<Forms />} />
          <Route path="students" element={<Students />} />
          <Route path="bulk-documents" element={<BulkDocuments />} />
          <Route path="promote-students" element={<PromoteStudents />} />
          <Route path="homework" element={<Homework />} />
          <Route path="fees" element={<Fees />} />
          <Route path="fee-defaulters" element={<FeeDefaulters />} />
          <Route path="collect-fee" element={<CollectFee />} />
          <Route path="settings" element={<Settings />} />
          <Route path="courses" element={<Courses />} />
          <Route path="course-materials" element={<CourseMaterials />} />
          <Route path="term-exam" element={<TermExam />} />
          <Route path="exam-marks" element={<ExamMarks />} />
          <Route path="grade-performance" element={<GradePerformanceDashboard />} />
          <Route path="exam-settings" element={<ExamSettings />} />
          <Route path="live-classes" element={<LiveClasses />} />
          <Route path="youtube" element={<Youtube />} />
          <Route path="classes" element={<Classes />} />
          <Route path="attendances" element={<Attendances />} />
          <Route
            path="test-results"
            element={
              <div className="p-6 text-center text-gray-500">
                Test Results Coming Soon
              </div>
            }
          />
          <Route path="circulars" element={<div className="p-6 text-center text-gray-500">Circulars Management Coming Soon</div>} />
          <Route path="staffs" element={<Staffs />} />
          <Route path="add-employee" element={<AddEmployee />} />
          <Route path="edit-employee/:id" element={<AddEmployee />} />
          <Route path="manage-staff-login" element={<ManageStaffLogin />} />
          <Route path="staff-submissions" element={<StaffWorkSubmissions />} />
          <Route path="salary" element={<Salary />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="add-income-expense" element={<AddIncomeExpense />} />
          <Route path="account-statement" element={<AccountStatement />} />
          <Route path="student-fee-statement" element={<StudentFeeStatement />} />
          <Route path="whatsapp" element={<WhatsApp />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="live-chat" element={<LiveChat />} />
          <Route path="chatbot-settings" element={<ChatbotSettings />} />
          <Route path="home-settings" element={<HomePageSettings />} />
          <Route path="behaviour" element={<Behaviour />} />
          <Route path="question-paper" element={<QuestionPaper />} />
          <Route path="subjects-grades" element={<Subjects />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="approve-password/:id" element={<ApprovePassword />} />
          <Route path="routine" element={<div className="p-6 text-center text-gray-500">Routine Management Coming Soon</div>} />
        </Route>
      </Routes>
    </Router>
  );
}