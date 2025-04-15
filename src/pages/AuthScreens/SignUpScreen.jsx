import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomInput from "../../components/InputAndButton/CustomInput";
import CustomButton from "../../components/InputAndButton/CustomButton";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import * as Yup from "yup";
import { useFormik } from "formik";
import { collection, addDoc } from "firebase/firestore";
import React from 'react';  // Add this line to resolve the error


// Validation Schema
const validationSchema = Yup.object().shape({
  name: Yup.string().required("Name is required"),
  email: Yup.string().email("Invalid email format").required("Email is required"),
  password: Yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
});

export default function SignUpScreen() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
    },
    validationSchema,
    onSubmit: async (values) => {
      setErrorMessage("");
      setLoading(true);

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const user = userCredential.user;

        await addDoc(collection(db, "mockUsers"), {
          uid: user.uid,
          name: values.name,
          email: user.email,
          whoIs: "isUser",
          createdAt: new Date(),
        });

        navigate("/"); // redirect after signup
      } catch (error) {
        console.error("Signup error:", error);
        setErrorMessage(error.message);
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <section className="h-full bg-gray-100 md:h-screen">
      <div className="flex flex-col items-center justify-center sm:flex-row">
        <div className="w-full p-4 md:w-8/12 lg:w-5/12 xl:w-5/12">
          <form onSubmit={formik.handleSubmit}>
            <h2 className="text-xl font-bold mb-4">Create Account</h2>

            <CustomInput
              placeholder={"Enter your name"}
              value={formik.values.name}
              onChange={formik.handleChange("name")}
              onBlur={formik.handleBlur("name")}
            />
            {formik.touched.name && formik.errors.name && (
              <p className="text-red-500">{formik.errors.name}</p>
            )}

            <CustomInput
              placeholder={"Enter your email"}
              value={formik.values.email}
              onChange={formik.handleChange("email")}
              onBlur={formik.handleBlur("email")}
            />
            {formik.touched.email && formik.errors.email && (
              <p className="text-red-500">{formik.errors.email}</p>
            )}

            <CustomInput
              placeholder={"Enter your password"}
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange("password")}
              onBlur={formik.handleBlur("password")}
            />
            {formik.touched.password && formik.errors.password && (
              <p className="text-red-500">{formik.errors.password}</p>
            )}

            {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}

            <div className="text-center mt-5">
              <CustomButton
                type="submit"
                disabled={loading}
                text={loading ? "Registering..." : "Register"}
              />
              <p className="mt-3 text-sm">
                Already have an account?{" "}
                <span
                  className="text-blue-600 cursor-pointer"
                  onClick={() => navigate("/auth/signin")}
                >
                  Login
                </span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
