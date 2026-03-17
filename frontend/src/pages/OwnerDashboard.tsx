interface VehicleHistoryRecord {
  fromOwner?: { name: string };
  toOwner?: { name: string };
  transferType?: string;
  timestamp: string;
  blockchainTxHash?: string;
}

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth";
import { useNavigate } from "react-router-dom";
import DocumentExpiryAlerts from "../components/DocumentExpiryAlerts";

import type { Vehicle } from "../types/api";

interface VehicleHistoryRecord {
  fromOwner?: { name: string };
  toOwner?: { name: string };
  transferType?: string;
  timestamp: string;
  blockchainTxHash?: string;
}

export default function OwnerDashboard() {
  const { user, logout, api } = useAuth();
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleHistory, setVehicleHistory] = useState<{
    [key: string]: VehicleHistoryRecord[];
  }>({});
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState("myVehicles"); // 'myVehicles', 'history', 'theft', 'profile'
  const [formData, setFormData] = useState({
    vehicleId: "",
    buyerEmail: "",
  });

  const [theftFormData, setTheftFormData] = useState({
    vehicleId: "",
    policeStation: "",
    firNumber: "",
    incidentDate: "",
    incidentLocation: "",
    description: "",
  });

  const [inheritanceFormData, setInheritanceFormData] = useState({
    vehicleRegNumber: "",
    deceasedOwnerId: "",
    deathCertificateNumber: "",
    relationshipToDeceased: "",
    successionCertificateNumber: "",
    courtOrderNumber: "",
    deathCertificateDoc: null as File | null,
    successionCertificateDoc: null as File | null,
    courtOrderDoc: null as File | null,
    relationshipProofDoc: null as File | null,
  });

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    aadhaarNumber: "",
    dlNumber: "",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>("");

  const loadProfileData = useCallback(async () => {
    // Load from user context (which has data from login)
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        aadhaarNumber: user.aadhaarNumber || "",
        dlNumber: user.dlNumber || "",
      });

      // Only attempt to load photo if user has profilePhoto data
      if (user.profilePhoto && user.profilePhoto.data) {
        try {
          const photoRes = await api.get(`/users/${user.id}/photo`, {
            responseType: "blob",
          });
          const photoUrl = URL.createObjectURL(photoRes.data);
          setProfilePhotoUrl(photoUrl);
        } catch {
          // Ignore errors - will show avatar
          console.log("No profile photo found, using default avatar");
        }
      }
    }
  }, [user, api]);

  // Load profile data when clicking on profile tab
  const handleProfileTabClick = () => {
    setActiveTab("profile");
    loadProfileData();
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await api.put(`/users/${user.id}`, profileData);
      alert("Profile updated successfully!");
      setIsEditingProfile(false);
      loadProfileData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update profile";
      alert(msg);
    }
  };

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await api.get("/vehicles/my");
      setVehicles(res.data);
    } catch (err: unknown) {
      console.error(err);
    }
  }, [api]);

  const fetchVehicleHistory = async (vehicleId: string, regNumber: string) => {
    try {
      const res = await api.get(`/vehicles/history/${regNumber}`);
      setVehicleHistory((prev) => ({
        ...prev,
        [vehicleId]: res.data,
      }));
    } catch (err: unknown) {
      console.error("Failed to fetch vehicle history:", err);
      alert("No ownership history available for this vehicle yet.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTheftChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setTheftFormData({ ...theftFormData, [e.target.name]: e.target.value });
  };

  const handleInheritanceChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setInheritanceFormData({
      ...inheritanceFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setInheritanceFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/requests/transfer", formData);
      alert("Transfer request submitted!");
      setShowForm(false);
      setFormData({ vehicleId: "", buyerEmail: "" });
      fetchVehicles();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(
        "Error submitting request: " +
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || errorMessage
      );
    }
  };

  const handleTheftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/theft/report", theftFormData);
      alert("Theft report submitted!");
      setShowForm(false);
      setTheftFormData({
        vehicleId: "",
        policeStation: "",
        firNumber: "",
        incidentDate: "",
        incidentLocation: "",
        description: "",
      });
      fetchVehicles();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(
        "Error submitting theft report: " +
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || errorMessage
      );
    }
  };

  const handleInheritanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("vehicleRegNumber", inheritanceFormData.vehicleRegNumber);
      formData.append("deceasedOwnerId", inheritanceFormData.deceasedOwnerId);
      formData.append(
        "deathCertificateNumber",
        inheritanceFormData.deathCertificateNumber
      );
      formData.append(
        "relationshipToDeceased",
        inheritanceFormData.relationshipToDeceased
      );
      formData.append(
        "successionCertificateNumber",
        inheritanceFormData.successionCertificateNumber
      );
      formData.append("courtOrderNumber", inheritanceFormData.courtOrderNumber);

      // Append files if they exist
      if (inheritanceFormData.deathCertificateDoc) {
        formData.append(
          "deathCertificate",
          inheritanceFormData.deathCertificateDoc
        );
      }
      if (inheritanceFormData.successionCertificateDoc) {
        formData.append(
          "successionCertificate",
          inheritanceFormData.successionCertificateDoc
        );
      }
      if (inheritanceFormData.courtOrderDoc) {
        formData.append("courtOrder", inheritanceFormData.courtOrderDoc);
      }
      if (inheritanceFormData.relationshipProofDoc) {
        formData.append(
          "relationshipProof",
          inheritanceFormData.relationshipProofDoc
        );
      }

      await api.post("/inheritance/request", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Inheritance transfer request submitted!");
      setShowForm(false);
      setInheritanceFormData({
        vehicleRegNumber: "",
        deceasedOwnerId: "",
        deathCertificateNumber: "",
        relationshipToDeceased: "",
        successionCertificateNumber: "",
        courtOrderNumber: "",
        deathCertificateDoc: null,
        successionCertificateDoc: null,
        courtOrderDoc: null,
        relationshipProofDoc: null,
      });
      fetchVehicles();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(
        "Error submitting inheritance request: " +
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message || errorMessage
      );
    }
  };

  // Load vehicles and profile on mount
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    const loadData = async () => {
      await fetchVehicles();
      await loadProfileData();
    };
    loadData();
  }, [user, navigate, fetchVehicles, loadProfileData]);

  return (
    <div className="container">
      <div className="navbar">
        <div className="container">
          <h2>BioChain RTO - Owner Dashboard</h2>
          <div className="nav-links">
            <span className="role-badge role-owner">OWNER</span>
            <button
              className="btn btn-danger"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Document Expiry Alerts */}
      <DocumentExpiryAlerts />

      <div className="card">
        <h3>Owner Dashboard</h3>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "myVehicles" ? "active" : ""}`}
            onClick={() => setActiveTab("myVehicles")}
          >
            My Vehicles
          </button>
          <button
            className={`tab-btn ${activeTab === "theft" ? "active" : ""}`}
            onClick={() => setActiveTab("theft")}
          >
            Report Theft
          </button>
          <button
            className={`tab-btn ${activeTab === "inheritance" ? "active" : ""}`}
            onClick={() => setActiveTab("inheritance")}
          >
            Inheritance Transfer
          </button>
          <button
            className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={handleProfileTabClick}
          >
            Profile
          </button>
        </div>

        {/* My Vehicles Tab */}
        {activeTab === "myVehicles" && (
          <div>
            <h4>My Registered Vehicles</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Reg No</th>
                  <th>Make & Model</th>
                  <th>Year</th>
                  <th>Status</th>
                  <th>Blockchain Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr key={v._id}>
                    <td>{v.regNumber || "Not Assigned"}</td>
                    <td>
                      {v.make} {v.model}
                    </td>
                    <td>{v.year}</td>
                    <td>
                      <span
                        className={`role-badge ${
                          v.status === "active" ? "role-owner" : "role-police"
                        }`}
                      >
                        {v.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {v.blockchainTxHash ? (
                        <span
                          className="role-badge role-owner"
                          title={v.blockchainTxHash}
                        >
                          ✅ On Blockchain
                        </span>
                      ) : (
                        <span className="role-badge role-dealer">
                          ⏳ Pending RTO
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-success"
                        onClick={() => {
                          if (v.blockchainTxHash) {
                            window.open(
                              `https://amoy.polygonscan.com/tx/${v.blockchainTxHash}`,
                              "_blank"
                            );
                          } else {
                            alert(
                              "Blockchain registration pending. This vehicle hasn't been registered on blockchain yet."
                            );
                          }
                        }}
                        title="View on Blockchain"
                        disabled={!v.blockchainTxHash}
                      >
                        🔗 Blockchain
                      </button>
                      <button
                        className="btn btn-info"
                        onClick={() => {
                          navigate(`/rc-card/${v._id}`);
                        }}
                        title="View RC Card"
                      >
                        📄 RC Card
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setFormData({ ...formData, vehicleId: v._id });
                          setShowForm(true);
                        }}
                      >
                        Sell
                      </button>
                      <button
                        className="btn btn-warning"
                        onClick={() => {
                          if (v.regNumber) {
                            fetchVehicleHistory(v._id, v.regNumber);
                          } else {
                            alert("Registration number not assigned yet.");
                          }
                        }}
                        title="View Ownership History"
                      >
                        📜 History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Vehicle History Section */}
            {Object.keys(vehicleHistory).length > 0 && (
              <div>
                <h4>Vehicle History</h4>
                {Object.entries(vehicleHistory).map(
                  ([vehicleId, history]: [string, VehicleHistoryRecord[]]) => (
                    <div key={vehicleId} className="history-section">
                      <h5>History for Vehicle ID: {vehicleId}</h5>
                      <table className="table">
                        <thead>
                          <tr>
                            <th>From</th>
                            <th>To</th>
                            <th>Type</th>
                            <th>Date</th>
                            <th>Blockchain Tx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map(
                            (record: VehicleHistoryRecord, index) => (
                              <tr key={index}>
                                <td>{record.fromOwner?.name || "Unknown"}</td>
                                <td>{record.toOwner?.name || "Unknown"}</td>
                                <td>{record.transferType || "transfer"}</td>
                                <td>
                                  {new Date(
                                    record.timestamp
                                  ).toLocaleDateString()}
                                </td>
                                <td>
                                  {record.blockchainTxHash
                                    ? record.blockchainTxHash.substring(0, 10) +
                                      "..."
                                    : "N/A"}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* Report Theft Tab */}
        {activeTab === "theft" && (
          <div>
            <h4>Report Vehicle Theft</h4>
            <form onSubmit={handleTheftSubmit}>
              <div className="form-group">
                <label>Vehicle</label>
                <select
                  name="vehicleId"
                  value={theftFormData.vehicleId}
                  onChange={handleTheftChange}
                  required
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.make} {v.model} ({v.regNumber || "Not Assigned"})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Police Station</label>
                <input
                  type="text"
                  name="policeStation"
                  value={theftFormData.policeStation}
                  onChange={handleTheftChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>FIR Number</label>
                <input
                  type="text"
                  name="firNumber"
                  value={theftFormData.firNumber}
                  onChange={handleTheftChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Incident Date</label>
                <input
                  type="date"
                  name="incidentDate"
                  value={theftFormData.incidentDate}
                  onChange={handleTheftChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Incident Location</label>
                <input
                  type="text"
                  name="incidentLocation"
                  value={theftFormData.incidentLocation}
                  onChange={handleTheftChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={theftFormData.description}
                  onChange={handleTheftChange}
                  required
                  rows={3}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-danger">
                Report Theft
              </button>
            </form>
          </div>
        )}

        {/* Inheritance Transfer Tab */}
        {activeTab === "inheritance" && (
          <div>
            <h4>Initiate Inheritance Transfer</h4>
            <div className="card">
              <p style={{ color: "#666", marginBottom: "20px" }}>
                <strong>Note:</strong> This form is used to transfer vehicle
                ownership in case of death of the owner. All legal documents
                must be uploaded for verification.
              </p>

              <form onSubmit={handleInheritanceSubmit}>
                <div className="form-group">
                  <label>
                    Vehicle Registration Number{" "}
                    <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="vehicleRegNumber"
                    value={inheritanceFormData.vehicleRegNumber}
                    onChange={handleInheritanceChange}
                    placeholder="KA01AB1234"
                    required
                  />
                  <small>
                    Enter the registration number of the deceased owner's
                    vehicle (e.g., KA01AB1234)
                  </small>
                </div>

                <div className="form-group">
                  <label>
                    Deceased Owner Name <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="deceasedOwnerId"
                    value={inheritanceFormData.deceasedOwnerId}
                    onChange={handleInheritanceChange}
                    placeholder="Enter deceased owner's full name"
                    required
                  />
                  <small>Full name of the deceased vehicle owner</small>
                </div>

                <div className="form-group">
                  <label>
                    Death Certificate Number{" "}
                    <span style={{ color: "red" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="deathCertificateNumber"
                    value={inheritanceFormData.deathCertificateNumber}
                    onChange={handleInheritanceChange}
                    placeholder="DC-2024-123456"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Relationship to Deceased{" "}
                    <span style={{ color: "red" }}>*</span>
                  </label>
                  <select
                    name="relationshipToDeceased"
                    value={inheritanceFormData.relationshipToDeceased}
                    onChange={handleInheritanceChange}
                    required
                  >
                    <option value="">Select Relationship</option>
                    <option value="spouse">Spouse (Husband/Wife)</option>
                    <option value="child">Child (Son/Daughter)</option>
                    <option value="parent">Parent (Father/Mother)</option>
                    <option value="sibling">Sibling (Brother/Sister)</option>
                    <option value="legal_heir">Legal Heir</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Succession Certificate Number (Optional)</label>
                  <input
                    type="text"
                    name="successionCertificateNumber"
                    value={inheritanceFormData.successionCertificateNumber}
                    onChange={handleInheritanceChange}
                    placeholder="SC-2024-789012"
                  />
                  <small>
                    Court-issued succession certificate number (if applicable)
                  </small>
                </div>

                <div className="form-group">
                  <label>Court Order Number (Optional)</label>
                  <input
                    type="text"
                    name="courtOrderNumber"
                    value={inheritanceFormData.courtOrderNumber}
                    onChange={handleInheritanceChange}
                    placeholder="CO-2024-345678"
                  />
                  <small>
                    Court order number for inheritance (if applicable)
                  </small>
                </div>

                <div style={{ marginTop: "30px", marginBottom: "20px" }}>
                  <h5>📄 Upload Required Documents</h5>

                  <div className="form-group">
                    <label>
                      1. Death Certificate{" "}
                      <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="file"
                      name="deathCertificateDoc"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                    />
                    <small>
                      Upload scanned copy of official death certificate
                      (PDF/Image)
                    </small>
                  </div>

                  <div className="form-group">
                    <label>2. Succession Certificate</label>
                    <input
                      type="file"
                      name="successionCertificateDoc"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <small>
                      Upload court-issued succession certificate if available
                      (PDF/Image)
                    </small>
                  </div>

                  <div className="form-group">
                    <label>3. Court Order</label>
                    <input
                      type="file"
                      name="courtOrderDoc"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <small>
                      Upload court order for inheritance if applicable
                      (PDF/Image)
                    </small>
                  </div>

                  <div className="form-group">
                    <label>
                      4. Relationship Proof{" "}
                      <span style={{ color: "red" }}>*</span>
                    </label>
                    <input
                      type="file"
                      name="relationshipProofDoc"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      required
                    />
                    <small>
                      Upload proof of relationship (Birth certificate, Marriage
                      certificate, Affidavit, etc.)
                    </small>
                  </div>
                </div>

                <button type="submit" className="btn btn-success">
                  Submit Inheritance Request
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="card">
          <div className="profile-header">
            <h3>My Profile</h3>
            {!isEditingProfile ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsEditingProfile(true)}
              >
                Edit Profile
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsEditingProfile(false);
                  loadProfileData();
                }}
              >
                Cancel
              </button>
            )}
          </div>

          <div className="profile-photo-container">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt="Profile"
                className="profile-photo"
              />
            ) : (
              <div className="profile-photo-placeholder">
                {profileData.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <form onSubmit={handleProfileSubmit}>
            <div className="row">
              <div className="col">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    required
                    disabled={!isEditingProfile}
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                    required
                    disabled
                  />
                  <small style={{ color: "#666" }}>
                    Email cannot be changed
                  </small>
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={(e) =>
                      setProfileData({ ...profileData, phone: e.target.value })
                    }
                    placeholder="+91 9876543210"
                    disabled={!isEditingProfile}
                  />
                </div>
              </div>
              <div className="col">
                <div className="form-group">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={profileData.address}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        address: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Enter your full address"
                    disabled={!isEditingProfile}
                  />
                </div>
                <div className="form-group">
                  <label>Aadhaar Number</label>
                  <input
                    type="text"
                    name="aadhaarNumber"
                    value={profileData.aadhaarNumber}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        aadhaarNumber: e.target.value,
                      })
                    }
                    placeholder="XXXX-XXXX-XXXX"
                    maxLength={12}
                    disabled={!isEditingProfile}
                  />
                </div>
                <div className="form-group">
                  <label>Driving License Number</label>
                  <input
                    type="text"
                    name="dlNumber"
                    value={profileData.dlNumber}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        dlNumber: e.target.value,
                      })
                    }
                    placeholder="DL Number"
                    disabled={!isEditingProfile}
                  />
                </div>
              </div>
            </div>
            {isEditingProfile && (
              <button type="submit" className="btn btn-primary">
                Save Profile
              </button>
            )}
          </form>
        </div>
      )}

      {showForm && (
        <div className="card">
          <h3>Sell Vehicle</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Buyer Email</label>
              <input
                type="email"
                name="buyerEmail"
                value={formData.buyerEmail}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn btn-success">
              Submit Transfer Request
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </button>
          </form>
        </div>
      )}
      <footer className="dashboard-footer">
        <p>© 2026 BioChain RTO System • Digital India Initiative</p>
      </footer>
    </div>
  );
}
