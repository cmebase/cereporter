import React from 'react';
import { format } from 'date-fns';

// Helper to clamp position values
const clampPercent = (val) => Math.max(0, Math.min(100, parseInt(val) || 0));

export default function CertificatePreviewRender({
  template,
  attendee,
  activity,
  config,
  editedData = {},
  selectedSection = null,
  setSelectedSection = () => {},
  isEditing = false,
  previewMode = 'physician'
}) {
  if (!template?.layout_json) {
    return <div className="text-slate-500">Template layout not configured.</div>;
  }

  // Clamp all position values to 0-100%
  const layout = editedData ? {
    ...editedData,
    topOffset: clampPercent(editedData.topOffset),
    leftOffset: clampPercent(editedData.leftOffset),
    certifiesTopOffset: clampPercent(editedData.certifiesTopOffset),
    participantNameTopOffset: clampPercent(editedData.participantNameTopOffset),
    participationTopOffset: clampPercent(editedData.participationTopOffset),
    activityTitleTopOffset: clampPercent(editedData.activityTitleTopOffset),
    onTextTopOffset: clampPercent(editedData.onTextTopOffset),
    completionDateTopOffset: clampPercent(editedData.completionDateTopOffset),
    attendedHoursTopOffset: clampPercent(editedData.attendedHoursTopOffset),
    courseDirectorTopOffset: clampPercent(editedData.courseDirectorTopOffset),
    creditDesignationTopOffset: clampPercent(editedData.creditDesignationTopOffset || 65),
    accreditationBottomOffset: clampPercent(editedData.accreditationBottomOffset),
    accreditationWidth: clampPercent(editedData.accreditationWidth)
  } : template.layout_json;
  const bgImage = config?.background_image_url || template?.background_image_url || template?.background_pdf_file_id;
  const isPhysician = previewMode === 'physician' || (attendee && ['MD', 'DO', 'MBBS'].includes(attendee.credential));

  return (
    <div
      className="relative rounded-lg shadow-2xl max-w-full h-auto"
      style={{
        backgroundImage: bgImage ? `url('${bgImage}')` : 'none',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        aspectRatio: '11/8.5',
        minWidth: '600px'
      }}
    >
      {!bgImage && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>No background image uploaded</p>
        </div>
      )}

      {bgImage && (
        <>
          {/* Client Name / Logo */}
           <div
             className={isEditing && selectedSection === 'clientName' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
             onClick={() => isEditing && setSelectedSection('clientName')}
             style={{
               top: `${layout.topOffset || 2}%`,
               left: '50%',
               transform: 'translateX(-50%)',
               width: '100%',
               textAlign: 'center',
               cursor: isEditing ? 'pointer' : 'default',
               backgroundColor: isEditing && selectedSection === 'clientName' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
               padding: isEditing && selectedSection === 'clientName' ? '8px 12px' : '0px',
               borderRadius: isEditing && selectedSection === 'clientName' ? '4px' : '0px'
             }}
           >
            {isEditing && selectedSection === 'clientName' && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Client Name / Logo
              </div>
            )}
            <p style={{
              fontSize: `${layout.fontSize || 18}px`,
              color: layout.textColor || '#06b6d4',
              fontWeight: 600,
              margin: 0
            }}>
              {layout.clientName || config?.client_name || activity?.hospital_name || 'Client Name or LOGO'}
            </p>
          </div>

          {/* Certifies that */}
          <div
            className={isEditing && selectedSection === 'certifiesThat' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
            onClick={() => isEditing && setSelectedSection('certifiesThat')}
            style={{
              top: `${layout.certifiesTopOffset || 15}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              textAlign: 'center',
              cursor: isEditing ? 'pointer' : 'default',
              backgroundColor: isEditing && selectedSection === 'certifiesThat' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              padding: isEditing && selectedSection === 'certifiesThat' ? '8px 12px' : '0px',
              borderRadius: isEditing && selectedSection === 'certifiesThat' ? '4px' : '0px'
            }}
          >
            {isEditing && selectedSection === 'certifiesThat' && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Certifies That
              </div>
            )}
            <p style={{
              fontSize: `${layout.certifiesFontSize || 16}px`,
              color: layout.certifiesColor || '#000000',
              margin: 0
            }}>
              Certifies that:
            </p>
          </div>

          {/* Participant name */}
          {attendee && (
            <div
              className={isEditing && selectedSection === 'participantName' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
              onClick={() => isEditing && setSelectedSection('participantName')}
              style={{
                top: `${layout.participantNameTopOffset || 22}%`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                textAlign: 'center',
                cursor: isEditing ? 'pointer' : 'default',
                backgroundColor: isEditing && selectedSection === 'participantName' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                padding: isEditing && selectedSection === 'participantName' ? '8px 12px' : '0px',
                borderRadius: isEditing && selectedSection === 'participantName' ? '4px' : '0px'
              }}
            >
              {isEditing && selectedSection === 'participantName' && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Participant Name
                </div>
              )}
              <p style={{
                fontSize: `${layout.participantNameFontSize || 16}px`,
                color: layout.participantNameColor || '#000000',
                fontWeight: 600,
                margin: 0
              }}>
                {attendee.participant?.first_name} {attendee.participant?.last_name}{attendee.credential ? `, ${attendee.credential}` : ''}
              </p>
            </div>
          )}

          {/* Participation text */}
          <div
            className={isEditing && selectedSection === 'participation' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
            onClick={() => isEditing && setSelectedSection('participation')}
            style={{
              top: `${layout.participationTopOffset || 28}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              textAlign: 'center',
              cursor: isEditing ? 'pointer' : 'default',
              backgroundColor: isEditing && selectedSection === 'participation' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              padding: isEditing && selectedSection === 'participation' ? '8px 12px' : '0px',
              borderRadius: isEditing && selectedSection === 'participation' ? '4px' : '0px'
            }}
          >
            {isEditing && selectedSection === 'participation' && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Participation Text
              </div>
            )}
            <p style={{
              fontSize: `${layout.participationFontSize || 14}px`,
              color: layout.participationColor || '#000000',
              margin: 0,
              lineHeight: 1.4
            }}>
              has participated in the <span style={{ textDecoration: 'underline', fontWeight: 600 }}>{activity?.method || 'Method'}</span> <span style={{ fontStyle: 'italic' }}>activity</span> titled
            </p>
          </div>

          {/* Activity title */}
          <div
            className={isEditing && selectedSection === 'activityTitle' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
            onClick={() => isEditing && setSelectedSection('activityTitle')}
            style={{
              top: `${layout.activityTitleTopOffset || 32}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '90%',
              textAlign: 'center',
              cursor: isEditing ? 'pointer' : 'default',
              backgroundColor: isEditing && selectedSection === 'activityTitle' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              padding: isEditing && selectedSection === 'activityTitle' ? '8px 12px' : '0px',
              borderRadius: isEditing && selectedSection === 'activityTitle' ? '4px' : '0px'
            }}
          >
            {isEditing && selectedSection === 'activityTitle' && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded text-center">
                Activity Title
              </div>
            )}
            <p style={{
              fontSize: `${layout.activityTitleFontSize || 16}px`,
              color: layout.activityTitleColor || '#000000',
              fontWeight: 600,
              margin: 0,
              lineHeight: 1.4,
              fontStyle: 'italic'
            }}>
              {layout.classTitle || activity?.title || 'Activity Title'}
            </p>
          </div>

          {/* On text */}
          <div
            className={isEditing && selectedSection === 'onText' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
            onClick={() => isEditing && setSelectedSection('onText')}
            style={{
              top: `${layout.onTopOffset || clampPercent(editedData.onTopOffset || 38)}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: `${editedData.onFontSize || layout.onTextFontSize || 16}px`,
              color: layout.onTextColor || '#000000',
              margin: 0,
              cursor: isEditing ? 'pointer' : 'default',
              backgroundColor: isEditing && selectedSection === 'onText' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              padding: isEditing && selectedSection === 'onText' ? '8px 12px' : '0px',
              borderRadius: isEditing && selectedSection === 'onText' ? '4px' : '0px'
            }}
          >
            {isEditing && selectedSection === 'onText' && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                On Text
              </div>
            )}
            {editedData?.onText || 'on'}
          </div>

          {/* Completion date */}
          <p
            className={isEditing && selectedSection === 'completionDate' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
            onClick={() => isEditing && setSelectedSection('completionDate')}
            style={{
              top: `${layout.completionDateTopOffset || 45}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: `${layout.completionDateFontSize || 14}px`,
              color: layout.completionDateColor || '#000000',
              margin: 0,
              cursor: isEditing ? 'pointer' : 'default',
              backgroundColor: isEditing && selectedSection === 'completionDate' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              padding: isEditing && selectedSection === 'completionDate' ? '8px 12px' : '0px',
              borderRadius: isEditing && selectedSection === 'completionDate' ? '4px' : '0px'
            }}
          >
            {isEditing && selectedSection === 'completionDate' && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Completion Date
              </div>
            )}
            {activity?.end_date ? format(new Date(activity.end_date), 'MMMM d, yyyy') : 'Month 1, 2025'}
          </p>

          {/* Attended hours */}
          {attendee && (
            <p
              className={isEditing && selectedSection === 'attendedHours' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
              onClick={() => isEditing && setSelectedSection('attendedHours')}
              style={{
                top: `${layout.attendedHoursTopOffset || 50}%`,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: `${layout.attendedHoursFontSize || 14}px`,
                color: layout.attendedHoursColor || '#000000',
                margin: 0,
                width: '90%',
                textAlign: 'center',
                cursor: isEditing ? 'pointer' : 'default',
                backgroundColor: isEditing && selectedSection === 'attendedHours' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                padding: isEditing && selectedSection === 'attendedHours' ? '8px 12px' : '0px',
                borderRadius: isEditing && selectedSection === 'attendedHours' ? '4px' : '0px'
              }}
            >
              {isEditing && selectedSection === 'attendedHours' && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Attended Hours
                </div>
              )}
              attended {attendee.attended_units || 0} {(attendee.attended_units || 0) === 1 ? 'hour' : 'hours'} of this accredited activity.
            </p>
          )}

          {/* Course director */}
          <p
            className={isEditing && selectedSection === 'courseDirector' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
            onClick={() => isEditing && setSelectedSection('courseDirector')}
            style={{
              top: `${layout.courseDirectorTopOffset || 60}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: `${layout.courseDirectorFontSize || 12}px`,
              color: layout.courseDirectorColor || '#000000',
              margin: 0,
              width: '90%',
              textAlign: 'center',
              cursor: isEditing ? 'pointer' : 'default',
              backgroundColor: isEditing && selectedSection === 'courseDirector' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              padding: isEditing && selectedSection === 'courseDirector' ? '8px 12px' : '0px',
              borderRadius: isEditing && selectedSection === 'courseDirector' ? '4px' : '0px'
            }}
          >
            {isEditing && selectedSection === 'courseDirector' && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Course Director
              </div>
            )}
            ___________________________________<br/>{editedData?.courseDirectorText || 'Course Director'}
            </p>

          {/* Credit designation (physician only) */}
          {isPhysician && (
            <div
              className={isEditing && selectedSection === 'creditDesignation' ? 'ring-2 ring-blue-600 ring-offset-2 absolute' : 'absolute'}
              onClick={() => isEditing && setSelectedSection('creditDesignation')}
              style={{
                top: `${layout.creditDesignationTopOffset || 65}%`,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '85%',
                textAlign: 'center',
                lineHeight: 1.3,
                cursor: isEditing ? 'pointer' : 'default',
                backgroundColor: isEditing && selectedSection === 'creditDesignation' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                padding: isEditing && selectedSection === 'creditDesignation' ? '8px 12px' : '0px',
                borderRadius: isEditing && selectedSection === 'creditDesignation' ? '4px' : '0px'
              }}
            >
              {isEditing && selectedSection === 'creditDesignation' && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Credit Designation
                </div>
              )}
              <p style={{
                margin: 0,
                fontSize: `${layout.creditDesignationFontSize || 11}px`,
                color: layout.creditDesignationColor || '#000000'
              }}>
                {editedData?.creditDesignationText || layout.creditDesignation || `(This activity was designated for ${activity?.credit_hours || '6.0'} ${activity?.credit_type || 'AMA PRA Category 1'} Credits™)`}
              </p>
            </div>
          )}

          {/* Accreditation statement */}
          <div
            className="absolute"
            onClick={() => isEditing && setSelectedSection('accreditationStatement')}
            style={{
              bottom: `${layout.accreditationBottomOffset || 4}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${layout.accreditationWidth || 86}%`,
              textAlign: 'center',
              maxHeight: '9%',
              overflow: 'hidden',
              lineHeight: 1.1,
              cursor: isEditing ? 'pointer' : 'default',
              backgroundColor: isEditing && selectedSection === 'accreditationStatement' ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
              padding: isEditing && selectedSection === 'accreditationStatement' ? '4px 8px' : '1px 4px',
              borderRadius: isEditing && selectedSection === 'accreditationStatement' ? '4px' : '0px',
              border: isEditing && selectedSection === 'accreditationStatement' ? '2px solid #16a34a' : 'none'
            }}
          >
            {isEditing && selectedSection === 'accreditationStatement' && (
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                Accreditation Statement
              </div>
            )}
            <p style={{
              margin: 0,
              fontSize: `${layout.accreditationFontSize || 7}px`,
              color: layout.accreditationColor || '#000000',
              wordWrap: 'break-word'
            }}>
              {layout.accreditationStatement || config?.accreditation_statement || 'This activity has been planned and implemented in accordance with the accreditation requirements...'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}