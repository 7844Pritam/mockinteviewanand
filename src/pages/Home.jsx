import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function InterviewerList() {
  const [interviewers, setInterviewers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInterviewers = async () => {
      const q = query(collection(db, "users"), where("isInterviewer", "==", true));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setInterviewers(data);
    };
    fetchInterviewers();
  }, []);

  return (
    <div className="p-6">
      <Navbar/>
      <h2 className="text-2xl font-bold mb-4">Available Interviewers</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {interviewers.map((interviewer) => (
          <div
            key={interviewer.id}
            className="p-4 border rounded cursor-pointer"
            onClick={() => navigate(`/interviewer/${interviewer.id}`)}
          >
            <h3 className="text-lg font-semibold">{interviewer.name}</h3>
            <p>{interviewer.bio}</p>
            <p>Skills: {interviewer.skills.join(", ")}</p>
            <p className="text-sm text-gray-600">Price: ₹{interviewer.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
