/**
 * GOOGLE APPS SCRIPT BACKEND WITH STRICT USER ISOLATION
 * Deploy as Web App -> Execute as: Me -> Access: Anyone
 */

function doGet(e) {
  const action = e.parameter.action || 'getData';
  
  if (action === 'getData') {
    const userId = e.parameter.userId || e.parameter.username;
    const skaterName = e.parameter.skaterName;
    const identifier = skaterName || userId;
    if (identifier) {
      return createJsonResponse({
        status: 'success',
        data: {
          sessions: getSkaterSessions(userId, skaterName),
          customTricks: getSkaterTricks(userId, skaterName)
        }
      });
    }
    return createJsonResponse({
      status: 'success',
      data: getAllData()
    });
  }
  
  return createJsonResponse({ status: 'error', message: 'Invalid GET action' });
}

function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const action = contents.action;
    
    if (action === 'initSheet') {
      setupDatabaseSheets();
      return createJsonResponse({ status: 'success', message: 'Sheets initialized successfully.' });
    }

    if (action === 'login') {
      return createJsonResponse(authenticateUser(contents.payload));
    }

    if (action === 'register') {
      return createJsonResponse(registerUser(contents.payload));
    }

    if (action === 'syncUserData') {
      const userId = contents.payload.userId || contents.payload.username;
      const skaterName = contents.payload.skaterName;
      return createJsonResponse({
        status: 'success',
        data: {
          sessions: getSkaterSessions(userId, skaterName),
          customTricks: getSkaterTricks(userId, skaterName)
        }
      });
    }
    
    if (action === 'logSession') {
      const result = saveSessionRecord(contents.payload);
      return createJsonResponse({ status: 'success', data: result });
    }
    
    if (action === 'addCustomTrick') {
      const result = saveCustomTrick(contents.payload);
      return createJsonResponse({ status: 'success', data: result });
    }

    if (action === 'editCustomTrick') {
      const result = updateCustomTrick(contents.payload);
      return createJsonResponse({ status: 'success', data: result });
    }

    if (action === 'deleteCustomTrick') {
      const result = removeCustomTrick(contents.payload);
      return createJsonResponse({ status: 'success', data: result });
    }
    
    return createJsonResponse({ status: 'error', message: 'Unknown action' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function setupDatabaseSheets() {
  const ss = getSpreadsheet();
  
  // Sheet 1: Users
  let userSheet = ss.getSheetByName('Users');
  if (!userSheet) {
    userSheet = ss.insertSheet('Users');
    userSheet.appendRow(['User ID', 'Username', 'Password', 'Skater Name', 'Account Status']);
    userSheet.appendRow(['001', 'aaryesh', 'password123', 'Aaryesh', 'Active']);
    userSheet.appendRow(['002', 'rohit', 'password123', 'Rohit', 'Active']);
  }

  // Sheet 2: Training Sessions (Standard Canonical Columns)
  let sessionSheet = ss.getSheetByName('Training Sessions');
  if (!sessionSheet) {
    sessionSheet = ss.insertSheet('Training Sessions');
    sessionSheet.appendRow([
      'Session ID', 'User ID', 'Date', 'Session Type', 'Trick Name', 
      'Category', 'Family', 'Target Cones', 'Completed Cones', 
      'Missed Cones', 'Falls', 'Success Rate', 'Connected Completion', 
      'Target Attempts', 'Completed Attempts', 'Performance Data', 'Notes', 'Timestamp'
    ]);
  }
  
  // Sheet 3: Tricks
  let trickSheet = ss.getSheetByName('Tricks');
  if (!trickSheet) {
    trickSheet = ss.insertSheet('Tricks');
    trickSheet.appendRow([
      'Trick ID', 'Trick Name', 'Category', 'Family', 'Type', 'User ID', 'Date Created'
    ]);
  }

  // Sheet 4: Skaters
  let skaterSheet = ss.getSheetByName('Skaters');
  if (!skaterSheet) {
    skaterSheet = ss.insertSheet('Skaters');
    skaterSheet.appendRow(['Skater ID', 'Skater Name', 'User ID']);
  }
}

function normalizeUserKey(identifier) {
  return String(identifier || '').trim().toLowerCase();
}

function authenticateUser(payload) {
  setupDatabaseSheets();
  const ss = getSpreadsheet();
  const users = sheetToObjects(ss.getSheetByName('Users'));
  
  const inputUsername = normalizeUserKey(payload.username);
  const inputPassword = String(payload.password || '').trim();

  const user = users.find(u => normalizeUserKey(u.username) === inputUsername);

  if (!user) {
    return { status: 'error', message: 'Account not found. Please check your username or register.' };
  }

  if (String(user.password).trim() !== inputPassword) {
    return { status: 'error', message: 'Incorrect username or password.' };
  }

  const accountStatus = String(user.accountstatus || 'Active').trim().toLowerCase();
  if (accountStatus !== 'active') {
    return { status: 'error', message: 'Your account is inactive. Please contact administrator.' };
  }

  const resolvedUserId = String(user.userid || user.username);
  const skaterName = String(user.skatername || user.username);

  const skaterSessions = getSkaterSessions(resolvedUserId, skaterName);
  const skaterTricks = getSkaterTricks(resolvedUserId, skaterName);

  return {
    status: 'success',
    user: {
      userId: resolvedUserId,
      username: user.username,
      skaterName: skaterName
    },
    data: {
      sessions: skaterSessions,
      customTricks: skaterTricks
    }
  };
}

function registerUser(payload) {
  setupDatabaseSheets();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const users = sheetToObjects(sheet);

  const inputUsername = String(payload.username || '').trim().toLowerCase();
  const inputPassword = String(payload.password || '').trim();
  const skaterName = String(payload.skaterName || payload.username || '').trim();

  if (!inputUsername || !inputPassword) {
    return { status: 'error', message: 'Username and password are required.' };
  }

  const exists = users.some(u => String(u.username).trim().toLowerCase() === inputUsername);
  if (exists) {
    return { status: 'error', message: 'Username is already registered. Please sign in.' };
  }

  const userId = 'USR-' + Date.now();
  sheet.appendRow([userId, payload.username, inputPassword, skaterName, 'Active']);

  let skaterSheet = ss.getSheetByName('Skaters');
  if (skaterSheet) {
    skaterSheet.appendRow(['SK8-' + Date.now(), skaterName]);
  }

  return {
    status: 'success',
    message: 'Account registered successfully! You can now log in.'
  };
}

// STRICT CANONICAL USER ISOLATION
function getMatchUserKeys(userId, skaterName) {
  const keys = new Set();
  if (userId) keys.add(normalizeUserKey(userId));
  if (skaterName) keys.add(normalizeUserKey(skaterName));

  const ss = getSpreadsheet();
  const userSheet = ss.getSheetByName('Users');
  if (userSheet) {
    const users = sheetToObjects(userSheet);
    const matchedUser = users.find(u => {
      const uId = normalizeUserKey(u.userid);
      const uName = normalizeUserKey(u.username);
      const sName = normalizeUserKey(u.skatername);
      return (userId && (uId === normalizeUserKey(userId) || uName === normalizeUserKey(userId) || sName === normalizeUserKey(userId))) ||
             (skaterName && (uId === normalizeUserKey(skaterName) || uName === normalizeUserKey(skaterName) || sName === normalizeUserKey(skaterName)));
    });

    if (matchedUser) {
      if (matchedUser.userid) keys.add(normalizeUserKey(matchedUser.userid));
      if (matchedUser.username) keys.add(normalizeUserKey(matchedUser.username));
      if (matchedUser.skatername) keys.add(normalizeUserKey(matchedUser.skatername));
    }
  }

  return Array.from(keys);
}

function formatDateIso(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    const yyyy = dateVal.getFullYear();
    const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
    const dd = String(dateVal.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const str = String(dateVal).trim();
  if (str.includes('T')) return str.split('T')[0];
  return str;
}

function getSkaterSessions(userId, skaterName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Training Sessions');
  if (!sheet) return [];
  const allSessions = sheetToObjects(sheet);

  const matchKeys = getMatchUserKeys(userId, skaterName);

  const userRows = allSessions.filter(s => {
    const sUser = normalizeUserKey(s.userid || s.skatername);
    return matchKeys.includes(sUser);
  });

  return userRows.map(s => {
    const sType = String(s.sessiontype || s.sessionType || 'Single');
    return {
      sessionId: s.sessionid || ('SESS-' + Date.now()),
      userId: s.userid || userId,
      skaterName: s.skatername || skaterName || s.userid,
      date: formatDateIso(s.date),
      sessionType: sType,
      trickName: s.trickname || s.trickcombo || 'Training Drill',
      category: s.category || 'OTHERS',
      family: s.family || 'Custom',
      targetCones: Number(s.targetcones || 0),
      completedCones: Number(s.completedcones || 0),
      missedCones: Number(s.missedcones || 0),
      falls: Number(s.falls || 0),
      successRate: Number(s.successrate || 0),
      connectedCompletion: s.connectedcompletion || 'N/A',
      targetAttempts: Number(s.targetattempts || 10),
      completedAttempts: Number(s.completedattempts || 0),
      performanceData: s.performancedata || '',
      notes: s.notes || '',
      timestamp: s.timestamp || ''
    };
  });
}

function getSkaterTricks(userId, skaterName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Tricks');
  if (!sheet) return [];
  const allTricks = sheetToObjects(sheet);

  const matchKeys = getMatchUserKeys(userId, skaterName);

  return allTricks.filter(t => {
    const tUser = normalizeUserKey(t.userid || t.skatername);
    return matchKeys.includes(tUser) && (t.type === 'Custom');
  }).map(t => ({
    id: t.trickid || t.id || ('CUST-' + Date.now()),
    trickId: t.trickid || t.id,
    trickName: t.trickname || t.name,
    name: t.trickname || t.name,
    category: t.category || 'OTHERS',
    family: t.family || 'Custom',
    type: 'Custom',
    userId: t.userid || userId,
    skaterName: t.skatername || skaterName || t.userid
  }));
}

function getAllData() {
  setupDatabaseSheets();
  const ss = getSpreadsheet();
  
  return {
    sessions: sheetToObjects(ss.getSheetByName('Training Sessions')),
    tricks: sheetToObjects(ss.getSheetByName('Tricks')),
    users: sheetToObjects(ss.getSheetByName('Users'))
  };
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      let key = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      obj[key] = row[index];
    });
    return obj;
  });
}

function saveSessionRecord(p) {
  setupDatabaseSheets();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Training Sessions');
  const timestamp = new Date().toISOString();
  
  const items = Array.isArray(p.items) ? p.items : [p];
  const sessionId = p.sessionId || ('SESS-' + Date.now());
  const userKey = normalizeUserKey(p.userId || p.skaterName || p.username);

  items.forEach((item) => {
    const target = Number(item.targetCones) || 0;
    const completed = Number(item.completedCones) || 0;
    const missed = Number(item.missedCones) || 0;
    const successRate = target > 0 ? parseFloat(((completed / target) * 100).toFixed(1)) : 0;
    const tAttempts = item.targetAttempts !== undefined && item.targetAttempts !== '' ? Number(item.targetAttempts) : 10;
    const cAttempts = item.completedAttempts !== undefined && item.completedAttempts !== '' ? Number(item.completedAttempts) : 0;

    let cleanNotes = String(item.userNotes || item.notes || p.sessionNotes || '').trim();
    if (cleanNotes.startsWith('{') && cleanNotes.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanNotes);
        cleanNotes = parsed.userNotes || parsed.notes || '';
      } catch(e) {}
    }

    sheet.appendRow([
      sessionId,
      userKey,
      String(p.date || item.date).split('T')[0],
      item.sessionType || 'Single',
      item.trickName || 'Training Drill',
      item.category || 'OTHERS',
      item.family || 'Custom',
      target,
      completed,
      missed,
      Number(item.falls) || 0,
      successRate,
      item.connectedCompletion || 'N/A',
      tAttempts,
      cAttempts,
      item.performanceData || '',
      cleanNotes,
      timestamp
    ]);
  });
  
  return { sessionId, savedItemsCount: items.length, status: 'success' };
}

function saveCustomTrick(p) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Tricks');
  const trickId = 'CUST-' + Date.now();
  const dateCreated = new Date().toISOString().split('T')[0];
  
  sheet.appendRow([
    trickId, p.trickName, p.category, p.family || 'Custom', 'Custom', p.skaterName, dateCreated
  ]);
  
  return { trickId, trickName: p.trickName };
}

function updateCustomTrick(p) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Tricks');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const rowTrickId = String(data[i][0]);
    const rowSkater = String(data[i][5]);
    
    if ((rowTrickId === String(p.id) || rowTrickId === String(p.trickId)) && 
        rowSkater.toLowerCase() === String(p.skaterName).toLowerCase()) {
      sheet.getRange(i + 1, 2).setValue(p.trickName);
      sheet.getRange(i + 1, 3).setValue(p.category);
      if (p.family) sheet.getRange(i + 1, 4).setValue(p.family);
      return { status: 'updated', trickId: p.id };
    }
  }
  return { status: 'not_found' };
}

function removeCustomTrick(p) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('Tricks');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const rowTrickId = String(data[i][0]);
    const rowSkater = String(data[i][5]);
    
    if ((rowTrickId === String(p.id) || rowTrickId === String(p.trickId)) && 
        rowSkater.toLowerCase() === String(p.skaterName).toLowerCase()) {
      sheet.deleteRow(i + 1);
      return { status: 'deleted', trickId: p.id };
    }
  }
  return { status: 'not_found' };
}
