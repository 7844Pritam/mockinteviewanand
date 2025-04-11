import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomInput from "../../components/InputAndButton/CustomInput";
import CustomButton from "../../components/InputAndButton/CustomButton";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { useFormik } from "formik";
import * as Yup from "yup";
import { collection, query, where, getDocs } from "firebase/firestore";

const validationSchema = Yup.object({
  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),
  password: Yup.string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export default function LoginScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setErrorMessage("");
      setLoading(true);

      try {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );

        const user = userCredential.user;

        // Fetch user role from Firestore
        const q = query(collection(db, "users"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data();
        console.log(userData);

          // Navigate based on role
          if (userData.isInterviewer === true){
            navigate("/interview-home");
          } else {
            navigate("/");
          }
        } else {
          navigate("/"); // Fallback if no data found
        }
      } catch (error) {
        console.error("Login error:", error.message);
        setErrorMessage("Invalid email or password");
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <section className="md:h-screen">
      <div className="container flex flex-wrap items-center justify-center h-full lg:justify-between">
        <div className="mb-12 md:w-9/12 lg:w-6/12">
          {/* Optional left content */}
        </div>

        <div className="mb-12 md:mb-0 md:w-8/12 lg:w-5/12">
          <form onSubmit={formik.handleSubmit}>
            <div className="flex items-center justify-center mb-4 lg:justify-start">
              <p className="mb-0 mr-4 text-lg">Sign in with your</p>
            </div>

            {/* Separator */}
            <div className="my-4 flex items-center before:flex-1 before:border-t after:flex-1 after:border-t">
              <p className="mx-4 mb-0 font-semibold text-center">Or</p>
            </div>

            <CustomInput
              placeholder="Enter your email"
              name="email"
              type="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.email && formik.errors.email && (
              <p className="text-red-500">{formik.errors.email}</p>
            )}

            <CustomInput
              placeholder="Enter your password"
              name="password"
              type="password"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            {formik.touched.password && formik.errors.password && (
              <p className="text-red-500">{formik.errors.password}</p>
            )}

            {errorMessage && <p className="text-red-500">{errorMessage}</p>}

            <div className="flex items-center justify-between mb-6">
              <label className="flex items-center cursor-pointer">
                <input className="w-4 h-4 mr-2" type="checkbox" />
                Remember me
              </label>
              <a href="#!">Forgot password?</a>
            </div>

            <div className="text-center lg:text-left">
              <CustomButton
                type="submit"
                text={loading ? "Logging in..." : "Login"}
                disabled={loading}
              />

              <p className="mt-2 text-sm font-semibold">
                Don't have an account?{" "}
                <a
                  href="/register"
                  className="text-blue-600 hover:underline"
                >
                  Register
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
