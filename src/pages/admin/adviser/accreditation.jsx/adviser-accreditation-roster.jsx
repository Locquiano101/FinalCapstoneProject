import { useEffect, useState } from "react";
import { API_ROUTER, DOCU_API_ROUTER } from "../../../../App";
import axios from "axios";
import { MoreHorizontal, MoreVertical, Users } from "lucide-react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { DonePopUp } from "../../../../components/components";

export function AdviserRosterData({ orgData }) {
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
  const [message, setMessage] = useState(
    `Dear ${orgData.orgName},\n\nWe kindly request you to complete your roster list as part of the accreditation process. Please ensure that all required members and details are submitted at the earliest convenience.\n\nThank you for your cooperation.\n\nSincerely,\nAdviser`
  );
  const [subject, setSubject] = useState("Notification for Roster Lists");

  const fetchRosterMembers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_ROUTER}/getRosterMembers/${orgData._id}`
      );
      console.log(response.data.roster);
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

  const SendNotification = async () => {
    if (!message.trim()) {
      alert("Message cannot be empty");
      return;
    }

    console.log({
      organizationId: orgData._id,
      subject,
      message,
    });
    try {
      setLoading(true);

      const response = await axios.post(
        `${API_ROUTER}/sendNotificationRoster`,
        {
          organizationId: orgData._id,
          subject,
          message,
        }
      );

      console.log("✅ Notification Response:", response.data);
      setPopup({
        type: "success",
        message: "Your action has been sent successfully!",
      });
      setError(null);
    } catch (err) {
      console.error("❌ Failed to send notification:", err.response.data);
      setError("Failed to send notification");
      setPopup({
        type: "error",
        message: "Something went wrong while processing your request.",
      });
    } finally {
      setLoading(false);
      setAlertModal(false);
      setIncompleteModal(false);
    }
  };

  const handleExportExcel = async () => {
    if (!rosterMembers || rosterMembers.length === 0) {
      alert("No roster data to export.");
      return;
    }

    // Create workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Roster Members");

    // Define headers
    worksheet.columns = [
      { header: "Name", key: "name", width: 25 },
      { header: "Position", key: "position", width: 20 },
      { header: "Email", key: "email", width: 30 },
      { header: "Contact Number", key: "contactNumber", width: 20 },
      { header: "Address", key: "address", width: 40 },
      { header: "Birth Date", key: "birthDate", width: 15 },
      { header: "Status", key: "status", width: 15 },
    ];

    // Add data rows
    rosterMembers.forEach((member) => {
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

    // Style header row
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

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Save file
    saveAs(new Blob([buffer]), "RosterMembers.xlsx");

    setExportModal(false); // close modal after export
  };

  const handleApproval = async ({ status, revisionNotes }) => {
    if (!rosterData?.roster?.isComplete) {
      setIncompleteModal(true); // 👈 open modal
      return;
    }

    try {
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
      setPopup({
        type: "error",
        message: "Something went wrong while processing your request.",
      });
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
      <div className="h-full overflow-auto">
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
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6 overflow-auto">
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
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-md transition"
            >
              Send
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
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-md transition"
            >
              Confirm Approval
            </button>
          </div>
        </div>
      )}
      {alertModal && (
        <div className="absolute bg-black/10 backdrop-blur-xs inset-0 flex justify-center items-center">
          <div className="h-fit bg-white w-1/3 flex flex-col px-6 py-6 justify-center items-center rounded-2xl shadow-xl">
            <h1 className="text-lg font-semibold mb-4">Notify Organization</h1>

            <div className="flex flex-col gap-4 w-full">
              {/* Subject */}
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="border rounded-lg w-full h-28 p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              onClick={SendNotification}
              className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-md transition"
            >
              Send
            </button>
          </div>
        </div>
      )}
      {exportModal && (
        <div className="absolute bg-black/10 backdrop-blur-xs inset-0 flex justify-center items-center">
          <div className="h-fit bg-white w-1/3 flex flex-col px-6 py-6 rounded-2xl shadow-xl relative">
            <button
              onClick={() => setExportModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
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
              >
                Cancel
              </button>
              <button
                onClick={handleExportExcel}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition"
              >
                Export
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

            <div className="flex flex-col gap-4 w-full">
              {/* Subject */}
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="border rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1 w-full">
                <label className="text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="border rounded-lg w-full h-28 p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIncompleteModal(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={SendNotification} // 👈 reuse your function
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-md transition"
              >
                Notify Organization
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
  console.log(`${DOCU_API_ROUTER}/${orgId}/${member.profilePicture}`);
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
