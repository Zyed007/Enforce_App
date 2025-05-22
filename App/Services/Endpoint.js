// Endpoint for the API
export const Endpoint = {
    LOGIN:
   '/Account/Login',
    GET_USER_DATA_BY_USER_ID:
   '/User/GetUserDataGroupByUserID',
   LAST_CHECKINBY_EMPID:
   '/User/LastCheckinByEmpID',
   FETCHALL_PROJECTBY_ORGID:
   '/Project/FetchAllProjectByOrgID',
   FINDBY_PROJECTID:
   '/Project/FindByProjectID',
    FIND_TEAMSBY_ORGID:
   '/Team/FindTeamsByOrgID',
   GET_ALL_FREELANCE_EMPBY_ORG_ID:
   '/Employee/GetAllFreelancerEmpByOrgID',
   GET_ALL_OUTSOURCED_EMPBY_ORG_ID:
   '/Employee/GetAllOutsourcedEmpByOrgID',
   GET_ALL_DEPARTMENT_EMPBY_ORG_ID:
   '/Department/FindDepartmentByOrgID',
   GET_ALL_DESIGNATION_EMPBY_DEPT_ID:
   '/Designation/FindDesignationByDeptID',
    FIND_DEPARTMENT_EMPLOYEE:
   '/Employee/FindEmployeeListByDepartmentID',
    FIND_EMP_DEPARTDESIGNBY_TEAMID:
   '/Employee/FindEmpDepartDesignByTeamID',
   ADD_TIMESHEET_CHECKIN: 
   '/Timesheet/AddTimesheet',
     FIND_BREAKIN_BREAKOUT:
   '/Timesheet/FindLastTimeSheetBreakByEmpIDAndGrpID',
    TIMESHEET_CHECKOUT:
   '/Timesheet/CheckOutByEmpID',
   TIMESHEET_BREAKIN:
   '/Timesheet/AddTimesheetBreak',
   TIMESHEET_BREAKOUT: 
   '/Timesheet/BreakOutByEmpIDAndGrpID',
   FIND_BY_ORGID:
   '/Organization/FindByOrgId',
   SAVE_FACEID_REGISTRATION: 
   '/Employee/SetFaceIDByEmpID',
   GET_ALL_DASHBOARD_COUNTS:
   '/AdminDashboard/GetAllDashboardCounts',
   TIMESHEET_TRAVEL_CLAIM:
   '/Timesheet/AddTravelClaimLocation',
   GET_EMPLOYEE_STATUS_BY_ORGID:
   '/Setup/GetEmployeeStatusByOrgID',
   GET_EMPLOYEE_TYPE_BY_ORGID:
   '/Setup/GetEmployeeTypeByOrgID',
   GET_EMPLOYEE_ROLE: 
   '/Setup/GetEmployeeRoles',
   ADD_EMPLOYEE: 
   '/Employee/AddEmployee',
   LOGIN_CALLBACK: 
   '/Account/LoginCallback',
   GET_ALL_EMPLOYESS: 
   '/Employee/FetchGridDataEmployeeByOrgID',
   GET_ALL_DESIGNATION_ByORG_ID:
   '/Designation/GetAllDesignationByOrgID',
   GET_ALL_DESIGNTION_EMPLOYEE: 
   '/Employee/GetEmpListWithRolesByOrgID',
   FIND_EMPLOYEE_DESIGNATION:
   '/Employee/FindEmployeeListByDesignationID',
   GET_ALL_EMPLOYEES_VIA_GROUPID:
   '/Timesheet/GetAllEmployeeByGroupID',
   HAND_OVER_CHECKOUT:
   '/Timesheet/TimesheetCheckoutHandoverByGroupID',
   ADD_FORCE_TIMESHEET_CHECKIN:
   '/Employee/AddMobileAppEvents',
   UPLOAD_IMAGE:
   '/api-v1/uploadImage'
   
  }
  
  export const BaseUrl = {
    API_BASE_URL: 'https://timeapi.enforcesolutions.com',
    API_BASE_URL2: 'https://circles-pro-backend.onrender.com',
  }