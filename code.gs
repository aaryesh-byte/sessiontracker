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
          customTricks: getSkaterTricks(userId, skaterName),
          masterPerformance: getSkaterMasterPerformance(userId, skaterName)
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
          customTricks: getSkaterTricks(userId, skaterName),
          masterPerformance: getSkaterMasterPerformance(userId, skaterName)
        }
      });
    }

    if (action === 'saveMasterPerformance') {
      const result = saveSkaterMasterPerformance(contents.payload);
      return createJsonResponse({ status: 'success', data: result });
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

  // Sheet 2: Training Sessions (18 Standard Canonical Columns)
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

  // Sheet 5: Master Performances
  let perfSheet = ss.getSheetByName('Master Performances');
  if (!perfSheet) {
    perfSheet = ss.insertSheet('Master Performances');
    perfSheet.appendRow(['User ID', 'Performance Title', 'Config JSON', 'Date Updated']);
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
  const masterPerformance = getSkaterMasterPerformance(resolvedUserId, skaterName);

  return {
    status: 'success',
    user: {
      userId: resolvedUserId,
      username: user.username,
      skaterName: skaterName
    },
    data: {
      sessions: skaterSessions,
      customTricks: skaterTricks,
      masterPerformance: masterPerformance
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

  const standardRecords = [];
  const perfRowsBySession = {};

  userRows.forEach(s => {
    const sType = String(s.sessiontype || s.sessionType || 'Single');
    if (sType === 'Performance') {
      const sId = String(s.sessionid || s.sessionId || ('SESS-' + Date.now()));
      if (!perfRowsBySession[sId]) perfRowsBySession[sId] = [];
      perfRowsBySession[sId].push(s);
    } else {
      standardRecords.push({
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
      });
    }
  });

  // Reconstruct performance sessions from individual trick rows
  const reconstructedPerfRecords = Object.keys(perfRowsBySession).map(sId => {
    const rows = perfRowsBySession[sId];
    if (rows.length === 0) return null;

    const firstRow = rows[0];
    const date = formatDateIso(firstRow.date);
    let runNotes = '';
    let perfTitle = 'Performance Run #1 (2 min)';
    let perfScore = 0;
    let smoothness = 0;
    let footwork = 0;

    // Check if single row contains legacy embedded snapshot
    if (rows.length === 1 && firstRow.performancedata && String(firstRow.performancedata).trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(firstRow.performancedata);
        if (parsed && parsed.snapshot) {
          return {
            sessionId: sId,
            userId: firstRow.userid || userId,
            skaterName: firstRow.skatername || skaterName || firstRow.userid,
            date: date,
            sessionType: 'Performance',
            trickName: firstRow.trickname || 'Performance Run #1 (2 min)',
            category: 'PERFORMANCE',
            family: firstRow.family || 'Valid',
            targetCones: Number(firstRow.targetcones || 0),
            completedCones: Number(firstRow.completedcones || 0),
            missedCones: Number(firstRow.missedcones || 0),
            falls: Number(firstRow.falls || 0),
            successRate: Number(firstRow.successrate || 0),
            connectedCompletion: 'N/A',
            targetAttempts: 1,
            completedAttempts: Number(firstRow.completedcones || 0) > 0 ? 1 : 0,
            performanceScore: Number(parsed.performanceScore || 0),
            smoothnessScore: Number(parsed.smoothnessScore || 0),
            footworkScore: Number(parsed.footworkScore || 0),
            performanceSnapshot: parsed.snapshot,
            notes: String(firstRow.notes || parsed.notes || '').trim(),
            timestamp: firstRow.timestamp || ''
          };
        }
      } catch(e) {}
    }

    // Reconstruct items from structured individual rows
    const itemsByOrder = {};
    rows.forEach(r => {
      let meta = {};
      if (r.performancedata && String(r.performancedata).trim().startsWith('{')) {
        try { meta = JSON.parse(r.performancedata); } catch(e) {}
      }

      if (meta.runNotes) runNotes = meta.runNotes;
      if (meta.perfTitle) perfTitle = meta.perfTitle;
      if (meta.perfScore !== undefined) perfScore = Number(meta.perfScore);
      if (meta.smoothness !== undefined) smoothness = Number(meta.smoothness);
      if (meta.footwork !== undefined) footwork = Number(meta.footwork);
      if (r.notes && !runNotes) runNotes = String(r.notes).trim();

      const orderKey = meta.order !== undefined ? meta.order : (Object.keys(itemsByOrder).length);

      if (!itemsByOrder[orderKey]) {
        itemsByOrder[orderKey] = {
          id: meta.itemId || ('pitem-' + orderKey),
          type: meta.type || (meta.comboName ? 'combo' : 'single'),
          name: meta.comboName || r.trickname,
          category: r.category || 'OTHERS',
          family: r.family || 'Custom',
          rows: []
        };
      }
      itemsByOrder[orderKey].rows.push({ row: r, meta: meta });
    });

    const reconstructedItems = Object.keys(itemsByOrder).sort((a, b) => Number(a) - Number(b)).map(orderKey => {
      const group = itemsByOrder[orderKey];
      if (group.type === 'combo') {
        const comboTricks = [];
        const comboSubCompleted = {};

        group.rows.sort((a, b) => Number(a.meta.subIndex || 0) - Number(b.meta.subIndex || 0)).forEach((rObj, idx) => {
          comboTricks.push(rObj.row.trickname);
          const isDone = Boolean(rObj.meta.isSubDone !== undefined ? rObj.meta.isSubDone : (Number(rObj.row.completedcones || 0) > 0));
          comboSubCompleted[idx] = isDone;
        });

        const allSubDone = comboTricks.length > 0 && comboTricks.every((_, i) => comboSubCompleted[i] === true);

        return {
          id: group.id,
          type: 'combo',
          name: group.name,
          comboTricks: comboTricks,
          category: group.category,
          family: group.family,
          completed: allSubDone,
          comboSubCompleted: comboSubCompleted
        };
      } else {
        const rObj = group.rows[0];
        const isDone = Boolean(rObj.meta.completed !== undefined ? rObj.meta.completed : (Number(rObj.row.completedcones || 0) > 0));
        return {
          id: group.id,
          type: 'single',
          name: rObj.row.trickname,
          category: group.category,
          family: group.family,
          completed: isDone
        };
      }
    });

    let totalIndividualTricks = 0;
    let totalCompletedTricks = 0;

    reconstructedItems.forEach(it => {
      if (it.type === 'combo') {
        const count = it.comboTricks.length;
        totalIndividualTricks += count;
        for (let i = 0; i < count; i++) {
          if (it.comboSubCompleted && it.comboSubCompleted[i] === true) totalCompletedTricks++;
        }
      } else {
        totalIndividualTricks += 1;
        if (it.completed) totalCompletedTricks += 1;
      }
    });

    const missedCount = Math.max(0, totalIndividualTricks - totalCompletedTricks);
    const successRate = totalIndividualTricks > 0 ? parseFloat(((totalCompletedTricks / totalIndividualTricks) * 100).toFixed(1)) : 0;

    return {
      sessionId: sId,
      userId: firstRow.userid || userId,
      skaterName: firstRow.skatername || skaterName || firstRow.userid,
      date: date,
      sessionType: 'Performance',
      trickName: perfTitle || 'Performance Run #1 (2 min)',
      category: 'PERFORMANCE',
      family: totalCompletedTricks >= 9 ? 'Valid' : 'Incomplete',
      targetCones: totalIndividualTricks,
      completedCones: totalCompletedTricks,
      missedCones: missedCount,
      falls: 0,
      successRate: successRate,
      connectedCompletion: 'N/A',
      targetAttempts: totalIndividualTricks,
      completedAttempts: totalCompletedTricks,
      performanceScore: perfScore,
      smoothnessScore: smoothness,
      footworkScore: footwork,
      performanceSnapshot: {
        id: sId,
        title: perfTitle,
        smoothness: smoothness,
        footwork: footwork,
        notes: runNotes,
        items: reconstructedItems
      },
      notes: runNotes,
      timestamp: firstRow.timestamp || ''
    };
  }).filter(Boolean);

  return [...standardRecords, ...reconstructedPerfRecords];
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

function getSkaterMasterPerformance(userId, skaterName) {
  setupDatabaseSheets();
  const ss = getSpreadsheet();
  const perfSheet = ss.getSheetByName('Master Performances');

  const defaultMaster = {
    title: '2-Minute Performance Routine',
    smoothness: 0,
    footwork: 0,
    items: []
  };

  if (!perfSheet) return defaultMaster;

  const allPerfs = sheetToObjects(perfSheet);
  const matchKeys = getMatchUserKeys(userId, skaterName);

  const userRows = allPerfs.filter(p => {
    const pUser = normalizeUserKey(p.userid || p.skatername);
    return matchKeys.includes(pUser);
  });

  if (userRows.length === 0) return defaultMaster;

  // Handle legacy single-row JSON format
  if (userRows.length === 1 && userRows[0].configjson) {
    try {
      const parsed = typeof userRows[0].configjson === 'string' ? JSON.parse(userRows[0].configjson) : userRows[0].configjson;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items) && parsed.items.length > 0) {
        return parsed;
      }
    } catch(e) {}
  }

  // Reconstruct master performance from structured individual trick rows
  const firstRow = userRows[0];
  const title = firstRow.performancetitle || firstRow.title || '2-Minute Performance Routine';
  const smoothness = Number(firstRow.smoothness || 0);
  const footwork = Number(firstRow.footwork || 0);

  const itemsByOrder = {};
  userRows.forEach(r => {
    const orderKey = r.itemorder !== undefined && r.itemorder !== '' ? Number(r.itemorder) : Object.keys(itemsByOrder).length;
    if (!itemsByOrder[orderKey]) {
      itemsByOrder[orderKey] = {
        id: r.itemid || ('pitem-' + orderKey),
        type: r.itemtype || (r.comboname ? 'combo' : 'single'),
        name: r.comboname || r.trickname,
        category: r.category || 'OTHERS',
        family: r.family || 'Custom',
        basePoints: Number(r.basepoints || 2),
        rows: []
      };
    }
    itemsByOrder[orderKey].rows.push(r);
  });

  const reconstructedItems = Object.keys(itemsByOrder).sort((a, b) => Number(a) - Number(b)).map(orderKey => {
    const group = itemsByOrder[orderKey];
    if (group.type === 'combo') {
      const comboTricks = [];
      group.rows.sort((a, b) => Number(a.combosubindex || 0) - Number(b.combosubindex || 0)).forEach(r => {
        comboTricks.push(r.trickname);
      });
      return {
        id: group.id,
        type: 'combo',
        name: group.name,
        comboTricks: comboTricks,
        category: group.category,
        family: group.family,
        basePoints: group.basePoints,
        completed: false
      };
    } else {
      const r = group.rows[0];
      return {
        id: group.id,
        type: 'single',
        name: r.trickname,
        category: group.category,
        family: group.family,
        basePoints: group.basePoints,
        completed: false
      };
    }
  });

  return {
    title: title,
    smoothness: smoothness,
    footwork: footwork,
    items: reconstructedItems.length > 0 ? reconstructedItems : defaultMaster.items
  };
}

function saveSkaterMasterPerformance(p) {
  setupDatabaseSheets();
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('Master Performances');
  if (!sheet) {
    sheet = ss.insertSheet('Master Performances');
    sheet.appendRow(['User ID', 'Performance Title', 'Item Order', 'Item ID', 'Item Type', 'Trick Name', 'Category', 'Family', 'Combo Name', 'Combo Sub Index', 'Base Points', 'Smoothness', 'Footwork', 'Notes', 'Date Updated']);
  }

  const userKey = normalizeUserKey(p.userId || p.skaterName || p.username);
  if (!userKey) return { status: 'error', message: 'No user identified.' };

  const mp = p.masterPerformance || {};
  const title = mp.title || '2-Minute Performance Routine';
  const smoothness = Number(mp.smoothness || 0);
  const footwork = Number(mp.footwork || 0);
  const items = Array.isArray(mp.items) ? mp.items : [];
  const dateUpdated = new Date().toISOString();

  // Delete existing master performance rows for userKey
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const rowUser = normalizeUserKey(data[i][0]);
    if (rowUser === userKey) {
      sheet.deleteRow(i + 1);
    }
  }

  // Save each trick in Master Performance as its own structured row
  if (items.length > 0) {
    items.forEach((item, itemIdx) => {
      if (item.type === 'combo') {
        const comboList = Array.isArray(item.comboTricks) ? item.comboTricks.filter(Boolean) : (item.name ? item.name.split(' → ').filter(Boolean) : []);
        comboList.forEach((subName, sIdx) => {
          sheet.appendRow([
            userKey, title, itemIdx, item.id || ('pitem-' + itemIdx), 'combo',
            subName, item.category || 'OTHERS', item.family || 'Custom',
            item.name || 'Combo Sequence', sIdx, item.basePoints || 3,
            smoothness, footwork, item.notes || '', dateUpdated
          ]);
        });
      } else {
        sheet.appendRow([
          userKey, title, itemIdx, item.id || ('pitem-' + itemIdx), 'single',
          item.name || 'Training Drill', item.category || 'OTHERS', item.family || 'B',
          '', 0, item.basePoints || 2,
          smoothness, footwork, item.notes || '', dateUpdated
        ]);
      }
    });
  } else {
    // Fallback single header row
    sheet.appendRow([
      userKey, title, 0, 'pitem-0', 'single',
      'Butterfly', 'OTHERS', 'B', '', 0, 2,
      smoothness, footwork, '', dateUpdated
    ]);
  }

  return { status: 'success', action: 'saved', masterPerformance: mp };
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

  items.forEach(item => {
    if (item.sessionType === 'Performance' || item.performanceSnapshot) {
      let snap = item.performanceSnapshot || { items: [] };
      const runNotes = String(item.notes || item.userNotes || snap.notes || '').trim();
      const smoothnessVal = item.smoothnessScore !== undefined ? Number(item.smoothnessScore) : (snap.smoothness !== undefined ? Number(snap.smoothness) : 0);
      const footworkVal = item.footworkScore !== undefined ? Number(item.footworkScore) : (snap.footwork !== undefined ? Number(snap.footwork) : 0);
      const perfScoreVal = item.performanceScore !== undefined ? Number(item.performanceScore) : 0;
      const perfTitleVal = item.trickName || snap.title || 'Performance Run #1 (2 min)';

      if (snap.items && snap.items.length > 0) {
        snap.items.forEach((perfItem, itemIdx) => {
          if (perfItem.type === 'combo') {
            const comboList = Array.isArray(perfItem.comboTricks) ? perfItem.comboTricks.filter(Boolean) : (perfItem.name ? perfItem.name.split(' → ').filter(Boolean) : []);
            const comboSubCompleted = perfItem.comboSubCompleted || {};

            comboList.forEach((subName, sIdx) => {
              const isSubDone = Boolean(comboSubCompleted[sIdx] === true || (comboSubCompleted[sIdx] === undefined && perfItem.completed === true));
              const subMeta = JSON.stringify({
                order: itemIdx,
                type: 'combo',
                comboName: perfItem.name || 'Combo Sequence',
                subIndex: sIdx,
                isSubDone: isSubDone,
                itemId: perfItem.id || ('pitem-' + itemIdx),
                smoothness: smoothnessVal,
                footwork: footworkVal,
                perfScore: perfScoreVal,
                perfTitle: perfTitleVal,
                runNotes: runNotes
              });

              sheet.appendRow([
                sessionId,
                userKey,
                String(p.date || item.date).split('T')[0],
                'Performance',
                subName,
                perfItem.category || 'OTHERS',
                perfItem.family || 'Custom',
                1,
                isSubDone ? 1 : 0,
                isSubDone ? 0 : 1,
                0,
                isSubDone ? 100 : 0,
                'Combo: ' + (perfItem.name || 'Combo Sequence'),
                1,
                isSubDone ? 1 : 0,
                subMeta,
                runNotes,
                timestamp
              ]);
            });
          } else {
            const isDone = Boolean(perfItem.completed);
            const singleMeta = JSON.stringify({
              order: itemIdx,
              type: 'single',
              itemId: perfItem.id || ('pitem-' + itemIdx),
              completed: isDone,
              smoothness: smoothnessVal,
              footwork: footworkVal,
              perfScore: perfScoreVal,
              perfTitle: perfTitleVal,
              runNotes: runNotes
            });

            sheet.appendRow([
              sessionId,
              userKey,
              String(p.date || item.date).split('T')[0],
              'Performance',
              perfItem.name || 'Training Drill',
              perfItem.category || 'OTHERS',
              perfItem.family || 'B',
              1,
              isDone ? 1 : 0,
              isDone ? 0 : 1,
              0,
              isDone ? 100 : 0,
              'Single',
              1,
              isDone ? 1 : 0,
              singleMeta,
              runNotes,
              timestamp
            ]);
          }
        });
      } else {
        sheet.appendRow([
          sessionId, userKey, String(p.date || item.date).split('T')[0],
          'Performance', perfTitleVal, 'PERFORMANCE', 'Valid',
          0, 0, 0, 0, 0, 'N/A', 1, 0,
          JSON.stringify({ smoothness: smoothnessVal, footwork: footworkVal, perfScore: perfScoreVal, runNotes: runNotes, snapshot: snap }),
          runNotes, timestamp
        ]);
      }
    } else {
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
    }
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
