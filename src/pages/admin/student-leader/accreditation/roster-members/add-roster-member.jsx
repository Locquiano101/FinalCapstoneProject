import React, { useState, useRef } from "react";
import { Save, Upload, X } from "lucide-react";
import { ProportionCropTool } from "../../../../../components/image_uploader";
import axios from "axios";
import { API_ROUTER } from "../../../../../App";
import { departments } from "../../../sdu/sdu-main";

export default function AddRosterForm({ onClose, orgData, onMemberAdded }) {
  // Initial state for resetting
  const initialState = {
    organizationProfile: "",
    isComplete: false,
    overAllStatus: "Pending",
    rosterMember: {
      name: "",
      email: "",
      address: "",
      department: orgData?.orgDepartment || "",
      course: orgData?.orgCourse || "",
      year: "",
      position: "",
      birthDate: "",
      studentId: "",
      contactNumber: "",
      status: "Active",
    },
  };

  console.log("org ID", orgData);
  console.log("org profile ID", orgData._id);

  const [rosterData, setRosterData] = useState(initialState);
  const [cropData, setCropData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});
  const cropRef = useRef();

  const resetForm = () => {
    setRosterData(initialState);
    setCropData(null);
    setErrors({});
    if (cropRef.current && cropRef.current.reset) {
      cropRef.current.reset();
    }
  };

  const updateMember = (field, value) => {
    setRosterData({
      ...rosterData,
      rosterMember: {
        ...rosterData.rosterMember,
        [field]: value,
      },
    });

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: "",
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "department") {
      setRosterData({
        ...rosterData,
        rosterMember: {
          ...rosterData.rosterMember,
          department: value,
          course: "", // Reset course when department changes
        },
      });
    } else if (name === "course") {
      updateMember("course", value);
    }

    // Clear error for this field when user makes a selection
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const member = rosterData.rosterMember;

    // Required field validations
    if (!member.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!member.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!member.position) {
      newErrors.position = "Position is required";
    }

    if (!member.department) {
      newErrors.department = "Department is required";
    }

    if (!member.course) {
      newErrors.course = "Course is required";
    }

    // Optional validations
    if (
      member.contactNumber &&
      !/^[+]?[\d\s\-()]+$/.test(member.contactNumber)
    ) {
      newErrors.contactNumber = "Please enter a valid contact number";
    }

    if (member.studentId && member.studentId.trim().length < 3) {
      newErrors.studentId = "Student ID must be at least 3 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCropComplete = (result) => {
    // Access the original File object
    console.log("Original File:", result.originalFile);
    // Access the cropped File object
    console.log("Cropped File:", result.croppedFile);

    setCropData(result);
  };

  const handleSubmit = async () => {
    // Validate form before submitting
    if (!validateForm()) {
      alert("Please fix the errors in the form before submitting.");
      return;
    }

    setIsProcessing(true);

    try {
      let finalCropData = cropData;

      // If there's an image uploaded but not cropped yet, crop it first
      if (cropRef.current && cropRef.current.hasImage && !cropData) {
        console.log("Cropping image before submit...");
        const result = await cropRef.current.cropImage();
        if (result) {
          finalCropData = result;
          setCropData(result);
          console.log("Crop completed:", result);
        }
      }

      // ============ CREATING FORMDATA OBJECT ============
      const formData = new FormData();

      // Add basic roster information to FormData
      formData.append("organization", orgData.organization);
      formData.append("organizationProfile", orgData._id);
      formData.append("isComplete", String(rosterData.isComplete));
      formData.append("overAllStatus", rosterData.overAllStatus);

      // Add roster member data to FormData
      const member = rosterData.rosterMember;
      formData.append("name", member.name);
      formData.append("email", member.email);
      formData.append("address", member.address);
      formData.append("department", member.department);
      formData.append("course", member.course);
      formData.append("year", member.year);
      formData.append("position", member.position);
      formData.append("birthDate", member.birthDate);
      formData.append("studentid", member.studentId);
      formData.append("contactNumber", member.contactNumber);
      formData.append("status", member.status);

      // Add cropped image file to FormData (if available)
      if (finalCropData && finalCropData.croppedFile) {
        formData.append("file", finalCropData.croppedFile);
        formData.append("profilePicture", finalCropData.croppedFile.name);
      }

      // Add metadata to FormData
      formData.append("submittedAt", new Date().toISOString());
      formData.append("totalMembers", "1");

      // ============ LOG FORMDATA CONTENTS ============
      console.log("=== FormData Contents ===");
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(
            `${key}: [FILE] ${value.name} (${value.size} bytes, ${value.type})`
          );
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      // ============ SEND FORMDATA TO BACKEND ============
      const response = await axios.post(
        `${API_ROUTER}/addRosterMember`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data", // optional: axios/browser will auto-set boundaries
          },
        }
      );
      console.log("Success:", response);
      alert("Roster submitted successfully!");
      resetForm(); // Reset form after successful submission

      // Call the callback to refresh parent component data
      if (onMemberAdded) {
        onMemberAdded();
      } else {
        onClose(); // Fallback to just closing if callback not provided
      }
    } catch (error) {
      console.error("Error during submit:", error);
      alert("Error processing submission. Please try again.");
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <div className="w-4xl max-h-[90vh] overflow-auto relative mx-auto p-6 rounded-xl bg-white">
      <X
        size={20}
        className="text-red absolute top-4 right-4 cursor-pointer hover:text-red-700"
        onClick={onClose}
      />
      <div className="">
        <h1 className="text-3xl text-center font-bold text-gray-900 mb-2">
          Add Roster Member
        </h1>
      </div>

      <div className=" flex flex-col gap-4">
        {/* Image Crop Tool */}
        <div className="">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Member Profile Picture
          </h2>
          <ProportionCropTool
            title="Crop Your Image"
            cropRef={cropRef}
            onCropComplete={handleCropComplete}
            maxImageHeight={500}
            showReset={true}
          />
        </div>

        {/* Roster Member */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Member Information
          </h2>

          <div className="bg-gray-50 p-6 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={rosterData.rosterMember.name}
                  onChange={(e) => updateMember("name", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter full name"
                  required
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={rosterData.rosterMember.email}
                  onChange={(e) => updateMember("email", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter email address"
                  required
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID
                </label>
                <input
                  type="text"
                  value={rosterData.rosterMember.studentId}
                  onChange={(e) => updateMember("studentId", e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.studentId ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter student ID"
                />
                {errors.studentId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.studentId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="position"
                      value="Officer"
                      checked={
                        rosterData.rosterMember.position !== "Member" &&
                        rosterData.rosterMember.position !== ""
                      }
                      onChange={() => updateMember("position", "Officer")}
                      className="mr-2"
                    />
                    Officer
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="position"
                      value="Member"
                      checked={rosterData.rosterMember.position === "Member"}
                      onChange={(e) => updateMember("position", e.target.value)}
                      className="mr-2"
                    />
                    Member
                  </label>
                </div>

                {/* Officer Role Textbox */}
                {rosterData.rosterMember.position !== "Member" &&
                  rosterData.rosterMember.position !== "" && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Officer Role <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={
                          rosterData.rosterMember.position !== "Member"
                            ? rosterData.rosterMember.position
                            : ""
                        }
                        onChange={(e) =>
                          updateMember("position", e.target.value)
                        }
                        placeholder="Enter officer role (e.g., President, Secretary)"
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}

                {errors.position && (
                  <p className="text-red-500 text-sm mt-1">{errors.position}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year Level
                </label>
                <select
                  value={rosterData.rosterMember.year}
                  onChange={(e) => updateMember("year", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Year</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <div className="flex gap-6">
                  <div className="flex flex-1 flex-col gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="department"
                      value={rosterData.rosterMember.department}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.department ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select Department</option>
                      {Object.keys(departments).map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                    {errors.department && (
                      <p className="text-red-500 text-sm">
                        {errors.department}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 gap-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Course <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="course"
                      value={rosterData.rosterMember.course}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.course ? "border-red-500" : "border-gray-300"
                      }`}
                      disabled={!rosterData.rosterMember.department}
                    >
                      <option value="">Select Course</option>
                      {rosterData.rosterMember.department &&
                        departments[rosterData.rosterMember.department]?.map(
                          (course) => (
                            <option key={course} value={course}>
                              {course}
                            </option>
                          )
                        )}
                    </select>
                    {errors.course && (
                      <p className="text-red-500 text-sm">{errors.course}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="md:col-span-3 flex gap-4 ">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={rosterData.rosterMember.birthDate}
                    onChange={(e) => updateMember("birthDate", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={rosterData.rosterMember.status}
                    onChange={(e) => updateMember("status", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={rosterData.rosterMember.address}
                  onChange={(e) => updateMember("address", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter complete address"
                  rows="2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={resetForm}
            className="px-6 py-3 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors font-medium"
          >
            Reset Form
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            <Save size={20} />
            {isProcessing ? "Processing..." : "Save Roster"}
          </button>
        </div>
      </div>
    </div>
  );
}
