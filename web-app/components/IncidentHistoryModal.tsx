import React, { useState } from 'react';
import { MigraineIncident } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  incidents: MigraineIncident[];
  onDeleteIncident?: (incidentId: string) => void;
}

export const IncidentHistoryModal: React.FC<Props> = ({ isOpen, onClose, incidents, onDeleteIncident }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      full: date.toLocaleString()
    };
  };

  const calculateAverages = (readings: any[]) => {
    if (readings.length === 0) return null;
    const avgHR = readings.reduce((sum, r) => sum + (r.heartRate || 0), 0) / readings.length;
    const avgTemp = readings.reduce((sum, r) => sum + (r.temperature || 0), 0) / readings.length;
    const avgHum = readings.reduce((sum, r) => sum + (r.humidity || 0), 0) / readings.length;
    const maxHR = Math.max(...readings.map(r => r.heartRate || 0));
    const minHR = Math.min(...readings.map(r => r.heartRate || 0));
    return { avgHR, avgTemp, avgHum, maxHR, minHR };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-nexus-panel w-full max-w-4xl rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <i className="fas fa-file-medical text-purple-500"></i>
                Migraine Incident Reports
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Complete history of reported migraine incidents with full analysis
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {incidents.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-12">
              <i className="fas fa-inbox text-4xl mb-4 opacity-50"></i>
              <p className="text-lg font-semibold">No incidents reported yet</p>
              <p className="text-sm mt-2">Report a migraine incident to start tracking patterns</p>
            </div>
          ) : (
            incidents.map((incident) => {
              const timeInfo = formatTimestamp(incident.timestamp);
              const averages = calculateAverages(incident.sensorReadings);
              const isExpanded = expandedId === incident.id;

              return (
                <div 
                  key={incident.id} 
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-all hover:shadow-lg"
                >
                  {/* Incident Header - Always Visible */}
                  <div 
                    className="p-5 cursor-pointer"
                    onClick={() => toggleExpand(incident.id)}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            incident.aiAnalysis?.status === 'CRITICAL' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                              : incident.aiAnalysis?.status === 'WARNING'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-500/30'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30'
                          }`}>
                            {incident.aiAnalysis?.status || 'ANALYSIS'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {timeInfo.date} at {timeInfo.time}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                          Migraine Incident Report
                        </h3>
                        {incident.aiAnalysis?.message && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {incident.aiAnalysis.message}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {onDeleteIncident && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteIncident(incident.id);
                            }}
                            className="text-xs px-2 py-1 rounded-md border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                          >
                            <i className="fas fa-trash-alt mr-1"></i> Delete
                          </button>
                        )}
                        <button className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 p-5 space-y-5">
                      {/* AI Analysis Section */}
                      {incident.aiAnalysis && (
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-500/30">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <i className="fas fa-brain text-purple-500"></i>
                            AI Analysis
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Status: </span>
                              <span className={`font-bold ${
                                incident.aiAnalysis.status === 'CRITICAL' ? 'text-red-600 dark:text-red-400' :
                                incident.aiAnalysis.status === 'WARNING' ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-blue-600 dark:text-blue-400'
                              }`}>
                                {incident.aiAnalysis.status}
                              </span>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">Analysis: </span>
                              <span className="text-slate-600 dark:text-slate-400">{incident.aiAnalysis.message}</span>
                            </div>
                            {incident.aiAnalysis.suggestedAction && (
                              <div>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Recommended Action: </span>
                                <span className="text-slate-600 dark:text-slate-400">{incident.aiAnalysis.suggestedAction}</span>
                              </div>
                            )}
                            {incident.aiAnalysis.identifiedPattern && (
                              <div className="mt-2 p-2 bg-white dark:bg-slate-700/50 rounded border border-slate-200 dark:border-slate-600">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">Identified Pattern: </span>
                                <span className="text-slate-600 dark:text-slate-400">{incident.aiAnalysis.identifiedPattern}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Sensor Data Section */}
                      {averages && (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Heart Rate</div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                              {averages.avgHR.toFixed(0)} <span className="text-sm text-slate-500">BPM</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Range: {averages.minHR.toFixed(0)}-{averages.maxHR.toFixed(0)} BPM
                            </div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Temperature</div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                              {averages.avgTemp.toFixed(1)} <span className="text-sm text-slate-500">°C</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {incident.sensorReadings.length} readings
                            </div>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Humidity</div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-white">
                              {averages.avgHum.toFixed(0)} <span className="text-sm text-slate-500">%</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {incident.sensorReadings.length} readings
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Weather Data Section */}
                      {incident.weatherData && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-500/30">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <i className="fas fa-cloud-sun text-blue-500"></i>
                            Weather Conditions
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Condition</div>
                              <div className="font-semibold text-slate-900 dark:text-white">{incident.weatherData.description}</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Pressure</div>
                              <div className="font-semibold text-slate-900 dark:text-white">{incident.weatherData.pressure} hPa</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Outdoor Temp</div>
                              <div className="font-semibold text-slate-900 dark:text-white">{incident.weatherData.temperature}°C</div>
                            </div>
                            <div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">Outdoor Humidity</div>
                              <div className="font-semibold text-slate-900 dark:text-white">{incident.weatherData.humidity}%</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* User Profile Snapshot */}
                      {incident.userProfileSnapshot && (
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <i className="fas fa-user text-slate-500"></i>
                            Profile Context (at time of incident)
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            {incident.userProfileSnapshot.age && (
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Age</div>
                                <div className="font-semibold text-slate-900 dark:text-white">{incident.userProfileSnapshot.age} years</div>
                              </div>
                            )}
                            {incident.userProfileSnapshot.typicalSleepHours && (
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Sleep</div>
                                <div className="font-semibold text-slate-900 dark:text-white">{incident.userProfileSnapshot.typicalSleepHours} hrs/night</div>
                              </div>
                            )}
                            {incident.userProfileSnapshot.caffeinePerDay !== undefined && (
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Caffeine</div>
                                <div className="font-semibold text-slate-900 dark:text-white">{incident.userProfileSnapshot.caffeinePerDay} cups/day</div>
                              </div>
                            )}
                            {incident.userProfileSnapshot.migraineHistoryYears !== undefined && (
                              <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">History</div>
                                <div className="font-semibold text-slate-900 dark:text-white">{incident.userProfileSnapshot.migraineHistoryYears} years</div>
                              </div>
                            )}
                          </div>
                          {incident.userProfileSnapshot.triggers && incident.userProfileSnapshot.triggers.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Known Triggers</div>
                              <div className="flex flex-wrap gap-2">
                                {incident.userProfileSnapshot.triggers.map((trigger, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">
                                    {trigger}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Sensor Readings Detail */}
                      {incident.sensorReadings.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                            <i className="fas fa-chart-line text-slate-500"></i>
                            Sensor Readings ({incident.sensorReadings.length} data points)
                          </h4>
                          <div className="max-h-48 overflow-y-auto">
                            <div className="grid grid-cols-4 gap-2 text-xs">
                              <div className="font-bold text-slate-500 dark:text-slate-400">Time</div>
                              <div className="font-bold text-slate-500 dark:text-slate-400">HR (BPM)</div>
                              <div className="font-bold text-slate-500 dark:text-slate-400">Temp (°C)</div>
                              <div className="font-bold text-slate-500 dark:text-slate-400">Humidity (%)</div>
                              {incident.sensorReadings.slice(-20).map((reading, idx) => {
                                const readingTime = new Date(reading.timestamp);
                                return (
                                  <React.Fragment key={idx}>
                                    <div className="text-slate-600 dark:text-slate-400">
                                      {readingTime.toLocaleTimeString()}
                                    </div>
                                    <div className={reading.heartRate > 100 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                                      {reading.heartRate.toFixed(0)}
                                    </div>
                                    <div className={reading.temperature > 28 ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                                      {reading.temperature.toFixed(1)}
                                    </div>
                                    <div className="text-slate-700 dark:text-slate-300">
                                      {reading.humidity.toFixed(0)}
                                    </div>
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Device Info */}
                      <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-600">
                        <div className="flex items-center gap-4">
                          <span>Device: <span className="font-semibold text-slate-700 dark:text-slate-300">{incident.deviceId}</span></span>
                          <span>Incident ID: <span className="font-mono text-slate-700 dark:text-slate-300">{incident.id.substring(0, 8)}...</span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {incidents.length} incident{incidents.length !== 1 ? 's' : ''} recorded
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
