import { useEffect, useState } from "react";
import { API_ROUTER, DOCU_API_ROUTER } from "../../../../App";
import axios from "axios";
import { MoreHorizontal, MoreVertical, Users, X } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { DonePopUp } from "../../../../components/components";

export function AdviserRosterData({ orgData, user }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [alertModal, setAlertModal] = useState(false);
  const [revisionModal, setRevisionModal] = useState(false);
  const [approvalModal, setApprovalModal] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [incompleteModal, setIncompleteModal] = useState(false);
  const [popup, setPopup] = useState(null);

  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [message, setMessage] = useState("");

  const [emailLoading, setEmailLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const [emailData, setEmailData] = useState({
    to: orgData.orgName,
    orgName: orgData.orgName,
    inquirySubject: "Roster Members Not Found",
    orgId: orgData._id,
    inquiryText: "",
    userPosition: user?.position || "",
    userName: user?.name || "",
  });

  const fetchRosterMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_ROUTER}/getRosterMembers/${orgData._id}`
      );
      setRosterData(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch organization info:", err);
      setError("Failed to load roster members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgData._id) {
      fetchRosterMembers();
    }
  }, [orgData._id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest(".dropdown-container")) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleExportExcel = async () => {
    if (!rosterData?.rosterMembers || rosterData.rosterMembers.length === 0) {
      alert("No roster data to export.");
      return;
    }

    try {
      setExportLoading(true); // ✅ Set export loading

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Roster Members");

      worksheet.columns = [
        { header: "Name", key: "name", width: 25 },
        { header: "Position", key: "position", width: 20 },
        { header: "Email", key: "email", width: 30 },
        { header: "Contact Number", key: "contactNumber", width: 20 },
        { header: "Address", key: "address", width: 40 },
        { header: "Birth Date", key: "birthDate", width: 15 },
        { header: "Status", key: "status", width: 15 },
      ];

      rosterData.rosterMembers.forEach((member) => {
        worksheet.addRow({
          name: member.name,
          position: member.position,
          email: member.email,
          contactNumber: member.contactNumber,
          address: member.address,
          birthDate: member.birthDate
            ? new Date(member.birthDate).toLocaleDateString()
            : "Not provided",
          status: member.status,
        });
      });

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDCE6F1" },
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "RosterMembers.xlsx");
      setExportModal(false);
    } catch (err) {
      console.error("❌ Failed to export:", err);
      setPopup({
        type: "error",
        message: "Failed to export roster data.",
      });
    } finally {
      setExportLoading(false); // ✅ Reset export loading
    }
  };

  const handleApproval = async ({ status, revisionNotes }) => {
    if (!rosterData?.roster?.isComplete) {
      setIncompleteModal(true);
      return;
    }

    try {
      setApprovalLoading(true); // ✅ Set approval loading

      const payload = { overAllStatus: status };
      if (revisionNotes && revisionNotes.trim() !== "") {
        payload.revisionNotes = revisionNotes;
      }

      const response = await axios.post(
        `${API_ROUTER}/postApproveRoster/${rosterData.roster._id}`,
        payload
      );

      console.log("✅ Approval success:", response.data);
      setPopup({
        type: "success",
        message: "Your action has been sent successfully!",
      });
      setError(null);
    } catch (err) {
      console.error("❌ Failed to approve:", err);
      setPopup({
        type: "error",
        message: "Something went wrong while processing your request.",
      });
    } finally {
      setApprovalLoading(false); // ✅ Reset approval loading
    }
  };

  // ✅ FIXED: Email handler
  const handleSendEmail = async () => {
    try {
      setEmailLoading(true); // ✅ Set email loading

      const response = await axios.post(
        `${API_ROUTER}/accreditationEmailInquiry`,
        emailData
      );
      console.log("📧 Email Sent:", response.data);
      setPopup({ type: "success", message: "Email sent successfully!" });
      setAlertModal(false);
    } catch (err) {
      console.error("❌ Failed to send email:", err);
      setPopup({ type: "error", message: "Failed to send email" });
    } finally {
      setEmailLoading(false); // ✅ Reset email loading
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading roster members...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  // Add this inside AdviserRosterData
  const handleDropdownAction = (id) => {
    setShowDropdown(false);

    if (id === "revision") {
      setRevisionModal(true);
    } else if (id === "Approval") {
      setApprovalModal(true);
    } else if (id === "export") {
      setExportModal(true);
    }
  };

  const rosterMembers = rosterData?.rosterMembers || [];

  const dropdownItems = [
    {
      id: "revision",
      label: "Revision of Roster",
    },
    {
      id: "Approval",
      label: "Approval of Roster",
    },
    {
      id: "export",
      label: "Export Roster as Spread Sheet",
    },
  ];

  return (
    <div className="flex p-4 flex-col bg-gray-50 h-full">
      {/* Header */}
      <div className="flex w-full justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Roster Management
          </h1>
          <h1 className="text-sm font-bold text-gray-900">
            Roster List Status:{" "}
            {rosterData.roster.isComplete ? "Complete" : "Not Complete"}
          </h1>
          <h1 className="text-sm font-bold text-gray-900">
            Roster List Approval Status: {rosterData.roster.overAllStatus}
          </h1>
        </div>

        {/* Dropdown Container */}
        <div className="relative flex justify-end w-64 dropdown-container">
          <button
            className={`text-5xl transition-colors flex items-center gap-2 ${
              showDropdown ? "rounded-t-lg" : "rounded-lg"
            }`}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <MoreHorizontal size={42} className=" text-cnsc-primary-color" />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 w-fit bg-white shadow-lg border border-gray-300 z-10">
              <div className="flex flex-col justify-end gap-1">
                {dropdownItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleDropdownAction(item.id)} // ✅ now it works
                    className="w-full  justify-end px-4 py-3 flex hover:bg-amber-200 items-center gap-3 transition-colors duration-300"
                  >
                    <span className="font-medium text-black">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Content */}
      <div className="h-full">
        {!rosterData || rosterMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center border border-dashed border-gray-300 rounded-lg bg-white">
            <p className="text-gray-500 mb-2">
              No roster has been started yet.
            </p>
            <p className="text-gray-400 mb-4">
              Click the Actions button above to begin creating your student
              leader roster.
            </p>
            <button
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              onClick={() => setAlertModal(true)}
            >
              Notify Organization
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 ">
            {rosterMembers.map((member) => (
              <RosterMemberCard
                key={member._id}
                member={member}
                orgId={orgData._id}
              />
            ))}
          </div>
        )}
      </div>
      {/* Revision Modal */}
      {revisionModal && (
        <div className="absolute bg-black/10 backdrop-blur-xs inset-0 flex justify-center items-center">
          <div className="h-fit bg-white w-1/3 flex flex-col px-6 py-6 rounded-2xl shadow-xl relative">
            {/* Close Button */}
            <button
              onClick={() => setRevisionModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              disabled={approvalLoading} // ✅ Disable when loading
            >
              ✕
            </button>

            <h1 className="text-lg font-semibold mb-4">
              Revision: Notify Organization
            </h1>

            <div className="flex flex-col gap-4 w-full">
              {/* Message */}
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="border rounded-lg w-full h-28 p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  disabled={approvalLoading} // ✅ Disable when loading
                />
              </div>
            </div>

            <button
              onClick={() => {
                handleApproval({
                  status: "Revision From the Adviser",
                  revisionNotes: message,
                }); // 👈 call with "Revision"
                setRevisionModal(false);
              }}
              disabled={approvalLoading} // ✅ Disable when loading
              className={`mt-6 px-6 py-2 rounded-lg text-sm font-medium shadow-md transition ${
                approvalLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {approvalLoading ? "Sending..." : "Send"} {/* ✅ Loading text */}
            </button>
          </div>
        </div>
      )}
      {/* Approval Modal */}
      {approvalModal && (
        <div className="absolute bg-black/10 backdrop-blur-xs inset-0 flex justify-center items-center">
          <div className="h-fit bg-white w-1/4 flex flex-col px-6 py-6 rounded-2xl shadow-xl relative">
            {/* Close Button */}
            <button
              onClick={() => setApprovalModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              disabled={approvalLoading} // ✅ Disable when loading
            >
              ✕
            </button>

            <h1 className="text-lg font-semibold mb-4">
              Approval: Roster of Organization
            </h1>

            <p className="mb-4 text-gray-700">
              By approving this section of the accreditation, you confirm that
              you have reviewed the information provided and consent to its
              approval. Would you like to proceed?
            </p>

            <button
              onClick={() => {
                handleApproval("Approved By the Adviser"); // 👈 call with "Approved"
                setApprovalModal(false);
              }}
              disabled={approvalLoading} // ✅ Disable when loading
              className={`mt-6 px-6 py-2 rounded-lg text-sm font-medium shadow-md transition ${
                approvalLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {approvalLoading ? "Processing..." : "Confirm Approval"}{" "}
              {/* ✅ Loading text */}
            </button>
          </div>
        </div>
      )}
      {alertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setAlertModal(false)}
              disabled={emailLoading} // ✅ Disable when loading
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold mb-4">
              Compose Email – President Notification
            </h3>

            <div className="flex flex-col gap-4">
              <label>
                <p>Organization name:</p>
                <input
                  type="email"
                  placeholder="To"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={emailData.to}
                  onChange={(e) =>
                    setEmailData({ ...emailData, to: e.target.value })
                  }
                  disabled={emailLoading} // ✅ Disable when loading
                />
              </label>
              <label>
                <p>Subject:</p>
                <input
                  type="text"
                  placeholder="Subject"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={emailData.inquirySubject}
                  onChange={(e) =>
                    setEmailData({
                      ...emailData,
                      inquirySubject: e.target.value,
                    })
                  }
                  disabled={emailLoading} // ✅ Disable when loading
                />
              </label>
              <label>
                <p>Message:</p>
                <textarea
                  placeholder="Message"
                  rows={5}
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={emailData.inquiryText}
                  onChange={(e) =>
                    setEmailData({ ...emailData, inquiryText: e.target.value })
                  }
                  disabled={emailLoading} // ✅ Disable when loading
                ></textarea>
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setAlertModal(false)}
                disabled={emailLoading} // ✅ Disable when loading
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 text-sm rounded ${
                  emailLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                onClick={handleSendEmail}
                disabled={emailLoading} // ✅ Disable when loading
              >
                {emailLoading ? "Sending..." : "Send Email"}{" "}
                {/* ✅ Loading text */}
              </button>
            </div>
          </div>
        </div>
      )}
      {exportModal && (
        <div className="absolute bg-black/10 backdrop-blur-xs inset-0 flex justify-center items-center">
          <div className="h-fit bg-white w-1/3 flex flex-col px-6 py-6 rounded-2xl shadow-xl relative">
            <button
              onClick={() => setExportModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              disabled={exportLoading} // ✅ Disable when loading
            >
              ✕
            </button>

            <h1 className="text-lg font-semibold mb-4">Export Roster</h1>
            <p className="text-sm text-gray-600 mb-6">
              Do you want to export the roster members into an Excel file?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setExportModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
                disabled={exportLoading} // ✅ Disable when loading
              >
                Cancel
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exportLoading} // ✅ Disable when loading
                className={`px-4 py-2 rounded-lg text-sm font-medium shadow-md transition ${
                  exportLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {exportLoading ? "Exporting..." : "Export"}{" "}
                {/* ✅ Loading text */}
              </button>
            </div>
          </div>
        </div>
      )}
      {incompleteModal && (
        <div className="absolute bg-black/10 backdrop-blur-xs inset-0 flex justify-center items-center">
          <div className="h-fit bg-white w-1/3 flex flex-col px-6 py-6 rounded-2xl shadow-xl relative">
            <button
              onClick={() => setIncompleteModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>

            <h1 className="text-lg font-semibold mb-4">Roster Incomplete</h1>
            <p className="text-sm text-gray-700 mb-4">
              The roster is not yet complete. Would you like to notify the
              organization to complete their roster list?
            </p>

            <h3 className="text-lg font-semibold mb-4">
              Compose Email – President Notification
            </h3>

            <div className="flex flex-col gap-4">
              <label>
                <p>Organization name:</p>
                <input
                  type="email"
                  placeholder="To"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={emailData.to}
                  onChange={(e) =>
                    setEmailData({ ...emailData, to: e.target.value })
                  }
                  disabled={emailLoading} // ✅ Disable when loading
                />
              </label>
              <label>
                <p>Subject:</p>
                <input
                  type="text"
                  placeholder="Subject"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={emailData.inquirySubject}
                  onChange={(e) =>
                    setEmailData({
                      ...emailData,
                      inquirySubject: e.target.value,
                    })
                  }
                  disabled={emailLoading} // ✅ Disable when loading
                />
              </label>
              <label>
                <p>Message:</p>
                <textarea
                  placeholder="Message"
                  rows={5}
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={emailData.inquiryText}
                  onChange={(e) =>
                    setEmailData({ ...emailData, inquiryText: e.target.value })
                  }
                  disabled={emailLoading} // ✅ Disable when loading
                ></textarea>
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setAlertModal(false)}
                disabled={emailLoading} // ✅ Disable when loading
              >
                Cancel
              </button>
              <button
                className={`px-4 py-2 text-sm rounded ${
                  emailLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
                onClick={handleSendEmail}
                disabled={emailLoading} // ✅ Disable when loading
              >
                {emailLoading ? "Sending..." : "Send Email"}{" "}
                {/* ✅ Loading text */}
              </button>
            </div>
          </div>
        </div>
      )}{" "}
      {popup && (
        <DonePopUp
          type={popup.type}
          message={popup.message}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}

const RosterMemberCard = ({ member, orgId }) => {
  return (
    <div className="bg-white w-full h-full rounded-lg flex flex-col gap-2 items-center shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <img
          src={
            member.profilePicture
              ? `${DOCU_API_ROUTER}/${orgId}/${member.profilePicture}`
              : "/cnsc-logo.png"
          }
          alt="Profile Picture"
          className="max-h-32 aspect-square border object-cover rounded"
        />
      </div>

      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-gray-900">
          Name: {member.name}
        </h3>
        <p className="text-sm font-medium text-indigo-600">{member.position}</p>
        <p className="text-sm text-gray-600">{member.email}</p>
        <p className="text-sm text-gray-600">{member.contactNumber}</p>
        <p className="text-sm text-gray-500">{member.address}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Birth Date:{" "}
          {member.birthDate
            ? new Date(member.birthDate).toLocaleDateString()
            : "Not provided"}
        </p>
        <p className="text-xs text-gray-500">Status: {member.status}</p>
      </div>
    </div>
  );
};
