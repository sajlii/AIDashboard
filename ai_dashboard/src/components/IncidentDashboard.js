import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Filter, Calendar, MapPin, AlertTriangle, TrendingUp, BarChart3, PieChart, Download, Bell, Settings,Plus, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import './incident.css';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const IncidentDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [incidentData, setIncidentData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;
  const [isEditing, setIsEditing] = useState(false);
const [editIncidentId, setEditIncidentId] = useState(null);

  useEffect(() => {
  if (currentPage !== 1) {
    setCurrentPage(1);
  }
}, [searchTerm, selectedCity, selectedType, dateRange]);

  const [newDescription, setNewDescription] = useState('');
  const [prediction, setPrediction] = useState('');

   const [showModal, setShowModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    description: '',
    nkill: '',
    nwound: '',
    city: '',
    incident_type: '',
    incident_date: '',
    propvalue: ''
  });

  

  useEffect(() => {
    axios.get(`${API_BASE_URL}/incidents`)
      .then(res => {
        setIncidentData(res.data);
      })
      .catch(err => console.error('Error fetching incidents:', err));
  }, []);

  const filteredIncidents = useMemo(() => {
    return incidentData.filter(incident => {
      const searchLower = searchTerm.toLowerCase();
const matchesSearch = !searchTerm ||
  (incident.description?.toLowerCase().includes(searchLower)) ||
  (incident.city?.toLowerCase().includes(searchLower)) ||
  (incident.incident_type?.toLowerCase().includes(searchLower)) ||
  incident.incident_date?.includes(searchTerm) ||
  incident.id?.toString().includes(searchTerm);


      const matchesCity = !selectedCity || incident.city === selectedCity;
      const matchesType = !selectedType || incident.incident_type === selectedType;
      // const matchesDate = (!dateRange.start || incident.date >= dateRange.start) &&
      //   (!dateRange.end || incident.date <= dateRange.end);
      const matchesDate =
  (!dateRange.start || new Date(incident.incident_date) >= new Date(dateRange.start)) &&
  (!dateRange.end || new Date(incident.incident_date) <= new Date(dateRange.end));


      return matchesSearch && matchesCity && matchesType && matchesDate;
    });
  }, [searchTerm, selectedCity, selectedType, dateRange, incidentData]);



  const paginatedIncidents = useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    return filteredIncidents.slice(startIndex, startIndex + recordsPerPage);
  }, [filteredIncidents, currentPage]);

  const totalPages = Math.ceil(filteredIncidents.length / recordsPerPage);





  // useEffect(() => {
  //   axios.get('http://localhost:5000/incidents')
  //     .then(res => setIncidentData(res.data))
  //     .catch(err => console.error('Error fetching incidents:', err));
  // }, []);
 
  const cities = [...new Set(incidentData.map(incident => incident.city))];
  const incidentTypes = ['fire_explosion', 'chemical'];



  // useEffect(() => {
  //   console.log("IDs from filtered incidents:", filteredIncidents.map(i => i.id));
  // }, [filteredIncidents]);

  const stats = useMemo(() => {
    const totalIncidents = filteredIncidents.length;
    const totalKilled = filteredIncidents.reduce((sum, inc) => sum + inc.nkill, 0);
    const totalWounded = filteredIncidents.reduce((sum, inc) => sum + inc.nwound, 0);
    const totalDamage = filteredIncidents.reduce((sum, inc) => sum + inc.propvalue, 0);
    return { totalIncidents, totalKilled, totalWounded, totalDamage };
  }, [filteredIncidents]);

  //Top Cities
  const topCities = useMemo(() => {
    const cityCountMap = {};

    filteredIncidents.forEach(inc => {
      if (!cityCountMap[inc.city]) cityCountMap[inc.city] = 0;
      cityCountMap[inc.city]++;
    });

    // Sort and take top 10
    return Object.entries(cityCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Limit to top 10
  }, [filteredIncidents]);


  const handleRefresh = () => {
    setIsLoading(true);
    axios.get(`${API_BASE_URL}/incidents`)
      .then(res => setIncidentData(res.data))
      .finally(() => setTimeout(() => setIsLoading(false), 1000));
  };

  // const handlePrediction = async () => {
  // if (!newDescription.trim()) {
  //   alert('Please enter a description');
  //   return;
  // }

  // try {
  //   const res = await axios.post('http://localhost:5000/predict', {
  //     description: newDescription
  //   });


  // setPrediction(res.data.predicted_incident_type || res.data.prediction || 'N/A');
  // alert(`Predicted Incident Type: ${res.data.predicted_incident_type || res.data.prediction}`);
  const handlePrediction = async () => {
    if (!newDescription.trim()) {
      alert('Please enter a description');
      return;
    }

    try {
     const res = await axios.post(`${API_BASE_URL}/predict`, {
        description: newDescription
      });

      const predicted = res.data.predicted_incident_type || res.data.prediction || 'N/A';
      setPrediction(predicted);
      alert(`Predicted Incident Type: ${predicted}`);
      setNewDescription(''); // clear input after prediction

    } catch (error) {
      console.error('Prediction error:', error);
      alert('Prediction failed');
    }
  };
const handleSaveIncident = async () => {
  try {
   const predictRes = await axios.post(`${API_BASE_URL}/predict`, {
      description: newIncident.description
    });
    const predictedType = predictRes.data.predicted_incident_type || 'unknown';

    const fullIncident = {
      ...newIncident,
      incident_type: predictedType,
      nkill: parseInt(newIncident.nkill) || 0,
      nwound: parseInt(newIncident.nwound) || 0,
      propvalue: parseFloat(newIncident.propvalue) || 0,
    };

    if (isEditing && editIncidentId !== null) {
      await axios.put(`${API_BASE_URL}/update-incident/${editIncidentId}`, fullIncident);
      alert('Incident updated');
    } else {
      await axios.post(`${API_BASE_URL}/add-incident`, fullIncident);
      alert(`Incident added with predicted type: ${predictedType}`);
    }

    setShowModal(false);
    setIsEditing(false);
    setEditIncidentId(null);
    setNewIncident({ description: '', nkill: '', nwound: '', city: '', incident_type: '', incident_date: '', propvalue: '' });
    handleRefresh();
  } catch (err) {
    console.error('Error saving incident:', err);
    alert('Error saving incident');
  }
};

const handleEditIncident = (incident) => {
  setIsEditing(true);
  setEditIncidentId(incident.id);
  setNewIncident({
    description: incident.description,
    nkill: incident.nkill,
    nwound: incident.nwound,
    city: incident.city,
    incident_date: incident.incident_date,
    propvalue: incident.propvalue
  });
  setShowModal(true);
};

const handleDeleteIncident = async (id) => {
  if (!window.confirm('Are you sure you want to delete this incident?')) return;

  try {
    await axios.delete(`${API_BASE_URL}/delete-incident/${id}`);
    alert('Incident deleted');
    handleRefresh();
  } catch (err) {
    console.error('Delete error:', err);
    alert('Failed to delete incident');
  }
};






  return (
    <div className="dashboard-container">
      {/* Animated Background */}
      <div className="animated-background">
        <div className="background-overlay">
          <div className="floating-orb orb-1"></div>
          <div className="floating-orb orb-2"></div>
          <div className="floating-orb orb-3"></div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-content">
            <div className="navbar-brand">
              <div className="brand-content">
                <AlertTriangle className="brand-icon" />
                <h1 className="brand-title">Incident Monitor</h1>
              </div>
            </div>

            {/* Search Bar */}
            <div className="search-container">
              <div className="search-wrapper">
                <div className="search-icon-wrapper">
                  <Search className="search-icon" />
                </div>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by description, city, type, date, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <div className="search-results-badge">
                    <span className="results-count">
                      {filteredIncidents.length} found
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="navbar-actions">
              <button className="add-button" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add Incident
              </button>

              <button
                onClick={handleRefresh}
                className={`action-button refresh-button ${isLoading ? 'loading' : ''}`}
              >
                <RefreshCw className="action-icon" />
              </button>
              <Bell className="nav-icon bell-icon" />
              <Settings className="nav-icon settings-icon" />
            </div>
          </div>
        </div>
      </nav>

      <div className="main-content">
        {/* Filters */}
        <div className="filters-section">
          <div className="filters-container">
            <div className="filters-header">
              <Filter className="filters-icon" />
              <h2 className="filters-title">Filters</h2>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Cities</option>
                  {cities.map(city => (
                    <option key={city} value={city} className="select-option">{city}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Incident Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Types</option>
                  {incidentTypes.map(type => (
                    <option key={type} value={type} className="select-option">
                      {type.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="filter-input"
                  max={dayjs().format('YYYY-MM-DD')}
                />
              </div>
              <div className="filter-group">
                <label className="filter-label">End Date</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="filter-input"
                  max={dayjs().format('YYYY-MM-DD')}
                />
              </div>
            </div>
          </div>
        </div>


        {/* Prediction Section */}
        <div className="predict-section">
          <h2 className="predict-title">Predict Incident Type</h2>
          <div className="predict-box">
            <textarea
              placeholder="Enter incident description..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="predict-textarea"
            />
            <button onClick={handlePrediction} className="predict-button">Predict</button>
            {prediction && (
              <div className="prediction-result">
                Predicted Type: <strong>{prediction}</strong>
              </div>
            )}
          </div>
        </div>


        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card stat-card-purple">
            <div className="stat-content">
              <div className="stat-icon-wrapper stat-icon-purple">
                <BarChart3 className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-label stat-label-purple">Total Incidents</p>
                <p className="stat-value">{stats.totalIncidents}</p>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-red">
            <div className="stat-content">
              <div className="stat-icon-wrapper stat-icon-red">
                <AlertTriangle className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-label stat-label-red">Fatalities</p>
                <p className="stat-value">{stats.totalKilled}</p>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-orange">
            <div className="stat-content">
              <div className="stat-icon-wrapper stat-icon-orange">
                <TrendingUp className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-label stat-label-orange">Injuries</p>
                <p className="stat-value">{stats.totalWounded}</p>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-green">
            <div className="stat-content">
              <div className="stat-icon-wrapper stat-icon-green">
                <PieChart className="stat-icon" />
              </div>
              <div className="stat-info">
                <p className="stat-label stat-label-green">Property Damage</p>
                <p className="stat-value-small">${(stats.totalDamage / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-section">
          <div className="tabs-container">
            {['overview', 'incidents', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-button ${activeTab === tab ? 'tab-active' : 'tab-inactive'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'incidents' && (
          <div className="content-card">
            <div className="content-header">
              <div className="content-header-content">
                <h3 className="content-title">Incident Records</h3>
                <button className="export-button">
                  <Download className="export-icon" />
                  Export
                </button>
              </div>
            </div>
            <div className="table-container">
              <table className="incidents-table">
                <thead className="table-header">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Type</th>
                    <th className="table-th">City</th>
                    <th className="table-th">Description</th>
                    <th className="table-th">Casualties</th>
                    <th className="table-th">Damage</th>
                    <th className="table-th">Actions</th>

                  </tr>
                </thead>
                <tbody className="table-body">
                  {paginatedIncidents.map((incident, index) => (
                    // <tr key={incident.id} className="table-row">
                    <tr key={`${incident.id}-${index}`} className="table-row">
<td className="table-td">
  {incident.incident_date && dayjs(incident.incident_date).isValid()
    ? dayjs(incident.incident_date).format('MMM D, YYYY')
    : 'N/A'}
</td>

                      <td className="table-td">
                        <span className={`incident-badge ${incident.incident_type === 'fire_explosion'
                          ? 'badge-fire'
                          : 'badge-chemical'
                          }`}>
                          {(incident.incident_type || '').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="city-cell">
                          <MapPin className="city-icon" />
                          {incident.city}
                        </div>
                      </td>
                      <td className="table-td description-cell">{incident.description}</td>
                      <td className="table-td">
                        <div>
                          <div className="casualty-row casualty-death">⚰ {incident.nkill}</div>
                          <div className="casualty-row casualty-injury">🏥 {incident.nwound}</div>
                        </div>
                      </td>
                      <td className="table-td damage-cell">
                        {/* ${incident.propvalue.toLocaleString()} */}
                        ${incident.propvalue != null ? incident.propvalue.toLocaleString() : '0'}
                      </td>

                      <td className="table-td actions-cell">
  <button className="edit-btn" onClick={() => handleEditIncident(incident)}>Edit</button>
  <button className="delete-btn" onClick={() => handleDeleteIncident(incident.id)}>Delete</button>
</td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="pagination-info">Page {currentPage} of {Math.ceil(filteredIncidents.length / recordsPerPage)}</span>
              <button
                className="pagination-button"
                onClick={() =>
                  setCurrentPage(prev =>
                    prev < Math.ceil(filteredIncidents.length / recordsPerPage) ? prev + 1 : prev
                  )
                }
                disabled={currentPage >= Math.ceil(filteredIncidents.length / recordsPerPage)}
              >
                Next
              </button>
            </div>


          </div>
        )}

        {activeTab === 'overview' && (
          <div className="overview-grid">
            <div className="overview-card">
              <h3 className="overview-title">Recent Incidents</h3>
              <div className="recent-incidents">
                {/* {filteredIncidents.slice(0, 3).map((incident) => (
                  <div key={incident.id} className="incident-item"> */}
                {[...filteredIncidents]
                // .filter(inc => inc.incident_date)
  .filter(inc =>
  inc.incident_date &&
  inc.description &&
  (inc.nkill > 0 || inc.nwound > 0 || inc.propvalue > 0))// Remove entries with null/undefined dates
  .sort((a, b) => new Date(b.incident_date) - new Date(a.incident_date))
  .slice(0, 3)
  .map((incident, index) => (

                  <div key={`${incident.id}-${index}`} className="incident-item">


                    <div className={`severity-indicator severity-${incident.severity}`}></div>
                    <div className="incident-content">
                      <div className="incident-meta">
                        <span className="incident-date">{incident.incident_date}</span>
                        <span className="incident-city">{incident.city}</span>
                      </div>
                      <p className="incident-description">{incident.description}</p>
                      <div className="incident-stats">
                        <span className="incident-stat">⚰ {incident.nkill}</span>
                        <span className="incident-stat">🏥 {incident.nwound}</span>
                        {/* <span className="incident-stat">${incident.propvalue.toLocaleString()}</span> */}
                        <span className="incident-stat">${incident.propvalue != null ? incident.propvalue.toLocaleString() : '0'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overview-card">
              <h3 className="overview-title">City Distribution</h3>
              <div className="city-distribution">
                {topCities.map(([city, count], index) => {
                  const percentage = (count / filteredIncidents.length) * 100;
                  return (
                    // <div key={city || index} className="city-item">
                    <div key={`${city}-${index}`} className="city-item">
                      <span className="city-name">{city}</span>
                      <div className="city-stats">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="city-count">{count}</span>
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="content-card">
            <h3 className="content-title analytics-title">Analytics Dashboard</h3>
            <div className="analytics-grid">
              <div className="analytics-section">
                <h4 className="analytics-subtitle">Incident Types</h4>
                <div className="incident-types">
                  {incidentTypes.map((type) => {
                    const typeIncidents = filteredIncidents.filter(inc => inc.incident_type === type);
                    const percentage = filteredIncidents.length > 0 ? (typeIncidents.length / filteredIncidents.length) * 100 : 0;
                    return (
                      <div key={type} className="type-item">
                        <span className="type-name">{type.replace('_', ' ')}</span>
                        <div className="type-stats">
                          <div className="type-progress-bar">
                            <div
                              className={`type-progress-fill ${type === 'fire_explosion' ? 'progress-fire' : 'progress-chemical'
                                }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="type-percentage">{percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="analytics-section">
                <h4 className="analytics-subtitle">Severity Analysis</h4>
                <div className="severity-analysis">
                  <div className="severity-circle">
                    <span className="severity-count">{filteredIncidents.length}</span>
                  </div>
                  <p className="severity-label">Total Filtered Incidents</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Incident Button (Floating Top Right) */}


{/* Modal for New Incident */}
{showModal && (
  <div className="modal-backdrop">
    <div className="modal">
      <h3>Add New Incident</h3>
      <input placeholder="Description" value={newIncident.description}
        onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })} />
      <input placeholder="Killed" type="number" value={newIncident.nkill}
        onChange={(e) => setNewIncident({ ...newIncident, nkill: parseInt(e.target.value) || 0 })} />
      <input placeholder="Wounded" type="number" value={newIncident.nwound}
        onChange={(e) => setNewIncident({ ...newIncident, nwound: parseInt(e.target.value) || 0 })} />
      <input placeholder="City" value={newIncident.city}
        onChange={(e) => setNewIncident({ ...newIncident, city: e.target.value })} />
     
      <input placeholder="Date" type="date" value={newIncident.incident_date}
        onChange={(e) => setNewIncident({ ...newIncident, incident_date: e.target.value })} 
         max={dayjs().format('YYYY-MM-DD')}
        />
      <input placeholder="Damage ($)" type="number" value={newIncident.propvalue}
        onChange={(e) => setNewIncident({ ...newIncident, propvalue: parseFloat(e.target.value) || 0 })} />

      <div className="modal-buttons">
               <button onClick={handleSaveIncident}>
          {isEditing ? 'Update' : 'Submit'}
        </button>
        <button onClick={() => setShowModal(false)}>Cancel</button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};


export default IncidentDashboard;