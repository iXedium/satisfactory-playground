import React from 'react';
import { useUI } from '../../hooks/useUI';
import { useComponentIntegration } from '../../hooks/useComponentIntegration';
import { RecentItems } from '../recent';
import './dashboard.css';

/**
 * Dashboard component that integrates different application features
 * and provides quick access to commonly used functionality
 */
const Dashboard: React.FC = () => {
  const { activeTab } = useUI();
  const { openSettingsToTab, openImportExport } = useComponentIntegration();
  
  // Only show dashboard on the home tab
  if (activeTab !== 'home') {
    return null;
  }
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Satisfactory Production Planner</h1>
        <p className="dashboard-subtitle">
          Plan, calculate and optimize your factory
        </p>
      </div>
      
      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">Quick Access</h2>
          <div className="dashboard-cards">
            <div 
              className="dashboard-card"
              onClick={() => openSettingsToTab('general')}
            >
              <div className="dashboard-card-icon">⚙️</div>
              <div className="dashboard-card-content">
                <h3>Settings</h3>
                <p>Configure application preferences</p>
              </div>
            </div>
            
            <div 
              className="dashboard-card"
              onClick={() => openImportExport('export')}
            >
              <div className="dashboard-card-icon">💾</div>
              <div className="dashboard-card-content">
                <h3>Export Data</h3>
                <p>Backup your current work</p>
              </div>
            </div>
            
            <div 
              className="dashboard-card"
              onClick={() => openImportExport('import')}
            >
              <div className="dashboard-card-icon">📂</div>
              <div className="dashboard-card-content">
                <h3>Import Data</h3>
                <p>Restore from a backup</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-section">
          <h2 className="dashboard-section-title">Features</h2>
          <div className="dashboard-cards">
            <div 
              className="dashboard-card"
              onClick={() => { /* Navigate to dependency tree */ }}
            >
              <div className="dashboard-card-icon">🌳</div>
              <div className="dashboard-card-content">
                <h3>Dependency Trees</h3>
                <p>Visualize production chains</p>
              </div>
            </div>
            
            <div 
              className="dashboard-card"
              onClick={() => { /* Navigate to calculator */ }}
            >
              <div className="dashboard-card-icon">🧮</div>
              <div className="dashboard-card-content">
                <h3>Calculator</h3>
                <p>Quick resource calculations</p>
              </div>
            </div>
            
            <div 
              className="dashboard-card"
              onClick={() => { /* Navigate to power view */ }}
            >
              <div className="dashboard-card-icon">⚡</div>
              <div className="dashboard-card-content">
                <h3>Power Overview</h3>
                <p>Analyze power consumption</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="dashboard-section">
          <RecentItems maxItems={10} className="dashboard-recent-items" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 