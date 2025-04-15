// BecomeInterviewerForm.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { doc, updateDoc, query, where, collection, getDocs } from "firebase/firestore";

export default function BecomeInterviewerForm() {
  const [formData, setFormData] = useState({
    bio: "",
    experience: "",
    skills: "",
    price: "",
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, "mockUsers"), where("uid", "==", user.uid));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;

      await updateDoc(docRef, {
        isInterviewer: true,
        bio: formData.bio,
        experience: formData.experience,
        skills: formData.skills.split(",").map((skill) => skill.trim()),
        price: parseInt(formData.price),
      });

      navigate("/interviewers");  // Redirect to the profile page
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Become an Interviewer</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          name="bio"
          placeholder="Short bio"
          className="w-full border p-2"
          value={formData.bio}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="experience"
          placeholder="Experience (e.g. 5+ years)"
          className="w-full border p-2"
          value={formData.experience}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="skills"
          placeholder="Skills (comma separated)"
          className="w-full border p-2"
          value={formData.skills}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="price"
          placeholder="Interview Price (₹)"
          className="w-full border p-2"
          value={formData.price}
          onChange={handleChange}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
