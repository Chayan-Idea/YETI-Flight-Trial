/* Daily Airworthiness Checklist schema sourced verbatim from the approved v3.0.0 PDF. */
window.YETI_DAILY_AIRWORTHINESS_TEMPLATE=[
  {
    "title": "1. UAV Specification",
    "items": [
      {
        "id": "1.1",
        "title": "UAV Weight",
        "criteria": [],
        "valueFields": [
          {
            "key": "totalWeight",
            "label": "UAV Total weight",
            "placeholder": "Enter UAV total weight"
          }
        ]
      },
      {
        "id": "1.2",
        "title": "UAV CG Point",
        "criteria": [],
        "valueFields": [
          {
            "key": "cgX",
            "label": "Along X / Longitudinal Axis",
            "placeholder": "Enter X-axis CG"
          },
          {
            "key": "cgY",
            "label": "Along Y / Lateral Axis",
            "placeholder": "Enter Y-axis CG"
          },
          {
            "key": "cgZ",
            "label": "Along Z / Vertical Axis",
            "placeholder": "Enter Z-axis CG"
          }
        ]
      }
    ]
  },
  {
    "title": "2. Safety & Crew",
    "items": [
      {
        "id": "2.1",
        "title": "Safety, V&V, Integration, Autopilot, FTI, and Propulsion teams are present.",
        "criteria": []
      },
      {
        "id": "2.2",
        "title": "Team is briefed on flight trial emergency procedures.",
        "criteria": []
      }
    ]
  },
  {
    "title": "3. General Setup",
    "items": [
      {
        "id": "3.1",
        "title": "Setup Description",
        "criteria": [],
        "valueFields": [
          {
            "key": "setupDescription",
            "label": "Setup Description",
            "placeholder": "Enter setup description"
          }
        ]
      },
      {
        "id": "3.2",
        "title": "UAV positioned at the center of the test area & test area is clear.",
        "criteria": []
      },
      {
        "id": "3.3",
        "title": "Fire extinguisher, first-aid kit, and emergency tools available and accessible.",
        "criteria": []
      },
      {
        "id": "3.4",
        "title": "DG placed at safe & appropriate distance considering noise and safety hazards; dedicated junction boxes installed at required locations.",
        "criteria": []
      }
    ]
  },
  {
    "title": "4. Airframe & Structure",
    "items": [
      {
        "id": "4.1.1",
        "title": "Cracks, dents and aesthetics",
        "criteria": [],
        "subsection": "1. Port-Side Wing Chcek"
      },
      {
        "id": "4.1.2",
        "title": "Screws fitment and loose parts",
        "criteria": [],
        "subsection": "1. Port-Side Wing Chcek"
      },
      {
        "id": "4.1.3",
        "title": "Antenna mounting, routing and",
        "criteria": [],
        "subsection": "1. Port-Side Wing Chcek"
      },
      {
        "id": "4.1.4",
        "title": "FOD in the wing",
        "criteria": [],
        "subsection": "1. Port-Side Wing Chcek"
      },
      {
        "id": "4.2.1",
        "title": "Cracks, dents and aesthetics",
        "criteria": [],
        "subsection": "2. Star-Board Side Wing Chcek"
      },
      {
        "id": "4.2.2",
        "title": "Screws fitment and loose parts",
        "criteria": [],
        "subsection": "2. Star-Board Side Wing Chcek"
      },
      {
        "id": "4.2.3",
        "title": "Antenna mounting, routing and",
        "criteria": [],
        "subsection": "2. Star-Board Side Wing Chcek"
      },
      {
        "id": "4.2.4",
        "title": "FOD in the wing",
        "criteria": [],
        "subsection": "2. Star-Board Side Wing Chcek"
      },
      {
        "id": "4.3.1",
        "title": "VTOL Motor fitment and tightness",
        "criteria": [],
        "subsection": "3. VTOL Propulsion"
      },
      {
        "id": "4.3.2",
        "title": "Propeller direction (CW ; CCW), fitment and tightness",
        "criteria": [],
        "subsection": "3. VTOL Propulsion"
      },
      {
        "id": "4.3.3",
        "title": "Cable ties on the VTOL arms are in place , no loose cable holders.",
        "criteria": [],
        "subsection": "3. VTOL Propulsion"
      },
      {
        "id": "4.3.4",
        "title": "The cooling line is not loose at the motor inlet, motor mount and not fouling with the motor.",
        "criteria": [],
        "subsection": "3. VTOL Propulsion"
      },
      {
        "id": "4.3.5",
        "title": "HV terminals and LV terminals are intact and properly insulated.",
        "criteria": [],
        "subsection": "3. VTOL Propulsion"
      },
      {
        "id": "4.3.6",
        "title": "Ensure no nicks, cuts or delamination to VTOL propellers",
        "criteria": [],
        "subsection": "3. VTOL Propulsion"
      },
      {
        "id": "4.3.7",
        "title": "No FOD in VTOL motors",
        "criteria": [],
        "subsection": "3. VTOL Propulsion"
      },
      {
        "id": "4.4.1",
        "title": "Cable ties on the FW arms are in place , no loose cable holders.",
        "criteria": [],
        "subsection": "4. FW Propulsion"
      },
      {
        "id": "4.4.2",
        "title": "HV terminals and LV terminals are intact and properly insulated.",
        "criteria": [],
        "subsection": "4. FW Propulsion"
      },
      {
        "id": "4.4.3",
        "title": "FW Motor fitment and tightness",
        "criteria": [],
        "subsection": "4. FW Propulsion"
      },
      {
        "id": "4.4.4",
        "title": "Propeller direction (CW ; CCW), fitment and tightness",
        "criteria": [],
        "subsection": "4. FW Propulsion"
      },
      {
        "id": "4.4.6",
        "title": "No FOD in FW motors",
        "criteria": [],
        "subsection": "4. FW Propulsion"
      },
      {
        "id": "4.5.1",
        "title": "No damages, dents, chipped edges and aesthetics on the tail surface and control surface hinge points",
        "criteria": [],
        "subsection": "5. Tail Assembly"
      },
      {
        "id": "4.5.2",
        "title": "Control surface horn fitment and movement is ok",
        "criteria": [],
        "subsection": "5. Tail Assembly"
      },
      {
        "id": "4.5.3",
        "title": "Screws fitment is proper and no loose parts",
        "criteria": [],
        "subsection": "5. Tail Assembly"
      },
      {
        "id": "4.5.4",
        "title": "No FOD in Tail Assembly",
        "criteria": [],
        "subsection": "5. Tail Assembly"
      },
      {
        "id": "4.6.1",
        "title": "No Cracks, dents, chipped edges, asthetics is ok. No loose cables and cable tie bases are not loose.",
        "criteria": [],
        "subsection": "6. HV Floor (No-Battery Area)"
      },
      {
        "id": "4.6.2",
        "title": "LV battery fitment",
        "criteria": [],
        "subsection": "6. HV Floor (No-Battery Area)"
      },
      {
        "id": "4.6.3",
        "title": "PDU fasteners are tightened.",
        "criteria": [],
        "subsection": "6. HV Floor (No-Battery Area)"
      },
      {
        "id": "4.6.4",
        "title": "ESC fasteners are tightened.",
        "criteria": [],
        "subsection": "6. HV Floor (No-Battery Area)"
      },
      {
        "id": "4.6.5",
        "title": "No FOD in the HV floor",
        "criteria": [],
        "subsection": "6. HV Floor (No-Battery Area)"
      },
      {
        "id": "4.7.1",
        "title": "Battery locking Velcro is intact.",
        "criteria": [],
        "subsection": "7. HV Floor (Battery Area)"
      },
      {
        "id": "4.7.2",
        "title": "No leakages from battery cooling system.",
        "criteria": [],
        "subsection": "7. HV Floor (Battery Area)"
      },
      {
        "id": "4.7.3",
        "title": "No loose cables.",
        "criteria": [],
        "subsection": "7. HV Floor (Battery Area)"
      },
      {
        "id": "4.7.4",
        "title": "Electrical connector is intact.",
        "criteria": [],
        "subsection": "7. HV Floor (Battery Area)"
      },
      {
        "id": "4.7.5",
        "title": "No FOD in the battery structure.",
        "criteria": [],
        "subsection": "7. HV Floor (Battery Area)"
      },
      {
        "id": "4.8.1",
        "title": "No loose cables.",
        "criteria": [],
        "subsection": "8. LV Floor"
      },
      {
        "id": "4.8.2",
        "title": "GNSS antena are intact and in the correct direction.",
        "criteria": [],
        "subsection": "8. LV Floor"
      },
      {
        "id": "4.9.1",
        "title": "No loose cooling pipes or its mounts & No leakage",
        "criteria": [],
        "subsection": "9. Propulsion Cooling System"
      },
      {
        "id": "4.9.2",
        "title": "Ensure PWM duty cycle is not between 11 to 55%.",
        "criteria": [],
        "subsection": "9. Propulsion Cooling System"
      },
      {
        "id": "4.9.3",
        "title": "Ensure reservoir is adequately filled with no leaks",
        "criteria": [],
        "subsection": "9. Propulsion Cooling System"
      },
      {
        "id": "4.9.4",
        "title": "Ensure radiator is securely mounted and free from any visible damage",
        "criteria": [],
        "subsection": "9. Propulsion Cooling System"
      }
    ]
  },
  {
    "title": "5. Battery & PDU Check (Before Power On)",
    "items": [
      {
        "id": "5.1",
        "title": "LV Battery Voltage",
        "criteria": [
          "The Voltage should be between 12 V to 13.9 V."
        ],
        "valueFields": [
          {
            "key": "lvVoltage",
            "label": "LV Battery Voltage (V)",
            "placeholder": "Enter measured voltage in V"
          }
        ]
      },
      {
        "id": "5.2",
        "title": "HV Battery Voltage",
        "criteria": [
          "Before installing on the aircraft, check all the batteries voltage should read zero voltage."
        ],
        "valueFields": [
          {
            "key": "hvPreInstallVoltage",
            "label": "HV Battery Voltage (V)",
            "placeholder": "Enter measured voltage in V"
          }
        ]
      }
    ]
  },
  {
    "title": "6. Battery & PDU Check (After Power On)",
    "items": [
      {
        "id": "6.1",
        "title": "PDU Status",
        "criteria": [
          "PDU SOC% > 85"
        ],
        "valueFields": []
      },
      {
        "id": "6.2",
        "title": "PDU State = 9 (Pass)",
        "criteria": [],
        "valueFields": []
      },
      {
        "id": "6.3",
        "title": "Beacon Functionality",
        "criteria": [
          "Ensure safety beacon is ON (Red Light)"
        ],
        "valueFields": []
      }
    ]
  },
  {
    "title": "7. Avionics & Software",
    "items": [
      {
        "id": "7.1",
        "title": "Flight controller powered ON; firmware version verified.",
        "criteria": []
      },
      {
        "id": "7.2",
        "title": "FTI sensors are calibrated and reporting correctly",
        "criteria": []
      },
      {
        "id": "7.3",
        "title": "GCS Status Check (Green Light)",
        "criteria": []
      },
      {
        "id": "7.4",
        "title": "Communication link established with GCS.",
        "criteria": []
      }
    ]
  },
  {
    "title": "8. Data recording and transmission",
    "items": [
      {
        "id": "8.1",
        "title": "Camera Functionality",
        "criteria": [
          "Camera placed and working ok."
        ]
      },
      {
        "id": "8.2",
        "title": "Sound Meter Functionality",
        "criteria": [
          "Sound recording is ok"
        ]
      },
      {
        "id": "8.3",
        "title": "Communication Check",
        "criteria": [
          "Communication check completed with pilot and responsible team members."
        ]
      }
    ]
  },
  {
    "title": "9. Other details",
    "items": [
      {
        "id": "9.0",
        "title": "Checker + Reviewer",
        "criteria": [],
        "displayId": "9"
      }
    ]
  }
];
window.YETI_DAILY_AIRWORTHINESS_DOCUMENT={title:"Daily Airworthiness Checklist",documentNumber:"IF_YETI_TD0_FTR_CKT_005",sourceFile:"Daily-Airworthiness-Checklist-2026.pdf",pageCount:2,version:"3.0.0"};
