// Existing matrix data preserved exactly from the supplied application.

const PREDEFINED_TRICKS = [
      // OTHERS
      { id: 'OTH-A1', name: 'Butterfly Cross', category: 'OTHERS', family: 'A' },
      { id: 'OTH-B1', name: 'Butterfly', category: 'OTHERS', family: 'B' },
      { id: 'OTH-B2', name: 'Toe to Reverse Eagle', category: 'OTHERS', family: 'B' },
      { id: 'OTH-C1', name: 'Back Cobra', category: 'OTHERS', family: 'C' },
      { id: 'OTH-C2', name: 'Cobra', category: 'OTHERS', family: 'C' },
      { id: 'OTH-C3', name: 'Reverse Eagle', category: 'OTHERS', family: 'C' },
      { id: 'OTH-C4', name: 'Two Wheels Eagle', category: 'OTHERS', family: 'C' },
      { id: 'OTH-D1', name: '7-Eagle', category: 'OTHERS', family: 'D' },
      { id: 'OTH-D2', name: 'Toe Toe Special', category: 'OTHERS', family: 'D' },
      { id: 'OTH-D3', name: 'Brush', category: 'OTHERS', family: 'D' },
      { id: 'OTH-D4', name: 'Heel Toe Special', category: 'OTHERS', family: 'D' },
      { id: 'OTH-D5', name: 'Eagle', category: 'OTHERS', family: 'D' },
      { id: 'OTH-D5', name: 'Eagle Cross', category: 'OTHERS', family: 'D' },
      { id: 'OTH-D6', name: 'Sweepers', category: 'OTHERS', family: 'D' },
      { id: 'OTH-E1', name: 'Eight', category: 'OTHERS', family: 'E' },
      { id: 'OTH-E2', name: 'Back Eight', category: 'OTHERS', family: 'E' },      
      { id: 'OTH-E3', name: 'Stroll', category: 'OTHERS', family: 'E' },
      { id: 'OTH-E3', name: 'Back Stroll', category: 'OTHERS', family: 'E' },
      { id: 'OTH-E4', name: 'Crazy', category: 'OTHERS', family: 'E' },
      { id: 'OTH-E4', name: 'Double Crazy Series', category: 'OTHERS', family: 'E' },
      { id: 'OTH-E5', name: 'Chapchap', category: 'OTHERS', family: 'E' },
      { id: 'OTH-E5', name: 'X', category: 'OTHERS', family: 'E' },     
      { id: 'OTH-E6', name: 'Mega Series', category: 'OTHERS', family: 'E' },
      { id: 'OTH-E7', name: 'Nelson', category: 'OTHERS', family: 'E' },
      { id: 'OTH-E7', name: 'Back Nelson Series', category: 'OTHERS', family: 'E' },

      // SITTING
      { id: 'SIT-A1', name: 'Back Toe Christie', category: 'SITTING', family: 'A' },
      { id: 'SIT-A2', name: 'Toe Christie', category: 'SITTING', family: 'A' },      
      { id: 'SIT-A3', name: 'Back Teapot', category: 'SITTING', family: 'A' },
      { id: 'SIT-A3', name: 'Back Superman', category: 'SITTING', family: 'A' },      
      { id: 'SIT-A4', name: 'Toe Footgun', category: 'SITTING', family: 'A' },
      { id: 'SIT-B1', name: 'Back Toe Footgun', category: 'SITTING', family: 'B' },      
      { id: 'SIT-B2', name: 'Superman', category: 'SITTING', family: 'B' },
      { id: 'SIT-B2', name: 'Teapot', category: 'SITTING', family: 'B' },      
      { id: 'SIT-C1', name: 'Back Sitting Cobra', category: 'SITTING', family: 'C' },
      { id: 'SIT-C2', name: 'Back Christie', category: 'SITTING', family: 'C' },
      { id: 'SIT-C3', name: 'Sitting Cobra', category: 'SITTING', family: 'C' },
      { id: 'SIT-C4', name: 'Christie', category: 'SITTING', family: 'C' },
      { id: 'SIT-C5', name: 'Back Footgun', category: 'SITTING', family: 'C' },
      { id: 'SIT-C6', name: 'Footgun', category: 'SITTING', family: 'C' },
      { id: 'SIT-D1', name: 'Sitting Heel Toe Back Cross', category: 'SITTING', family: 'D' },
      { id: 'SIT-D2', name: 'Sitting Heel Toe Cross', category: 'SITTING', family: 'D' },
      { id: 'SIT-D3', name: 'Back Sitting Heel Toe Snake', category: 'SITTING', family: 'D' },
      { id: 'SIT-D4', name: 'Sitting Heel Toe Snake', category: 'SITTING', family: 'D' },      
      { id: 'SIT-E1', name: 'Small Cart', category: 'SITTING', family: 'E' },
      { id: 'SIT-E1', name: '5 Wheels Sitting', category: 'SITTING', family: 'E' },     
      { id: 'SIT-E2', name: 'Sitting Fish', category: 'SITTING', family: 'E' },

      // JUMPING
      { id: 'JMP-A1', name: 'Front Toe Footgun Kazachok', category: 'JUMPING', family: 'A' },
      { id: 'JMP-A2', name: 'Heel Wiper', category: 'JUMPING', family: 'A' },
      { id: 'JMP-A3', name: 'Toe Wiper', category: 'JUMPING', family: 'A' },
      { id: 'JMP-B1', name: 'Footgun Spin Jump', category: 'JUMPING', family: 'B' },
      { id: 'JMP-B2', name: 'Back Kazachok', category: 'JUMPING', family: 'B' },
      { id: 'JMP-C1', name: 'Kazachok Spin', category: 'JUMPING', family: 'C' },
      { id: 'JMP-C2', name: 'Front Wiper', category: 'JUMPING', family: 'C' },
      { id: 'JMP-C3', name: 'Wiper', category: 'JUMPING', family: 'C' },
      { id: 'JMP-D1', name: 'Footspin Jump', category: 'JUMPING', family: 'D' },
      { id: 'JMP-E1', name: 'X Jump', category: 'JUMPING', family: 'E' },
      { id: 'JMP-E2', name: 'Crab Cross', category: 'JUMPING', family: 'E' },
      { id: 'JMP-E3', name: 'Crab Series', category: 'JUMPING', family: 'E' },

      // WHEELING
      { id: 'WHL-A1', name: 'Toe Backward Infinity Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A1', name: 'Toe Backward Infinity Traingle', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Toe Side Infinity Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Toe Side normal Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Toe Fwd Infinity Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Toe Fwd Infinity Triangle', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A1', name: 'Heel Backward Infinity Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A1', name: 'Heel Backward Infinity Traingle', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Heel Side Infinity Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Heel Side normal Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Heel Fwd Infinity Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Heel Fwd Infinity Triangle', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A3', name: 'Toe Noviper (Shift)', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A3', name: 'Toe Internal Shift', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A3', name: 'Toe Fake', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A3', name: 'Toe External Shift', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A3', name: 'Heel Noviper (Shift)', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A3', name: 'Heel Internal Shift', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A3', name: 'Heel Fake', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A3', name: 'Heel External Shift', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A1', name: 'Toe Backward Traingle', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A1', name: 'Toe Backward Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Toe Fwd Triangle', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Toe Fwd Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A1', name: 'Heel Backward Traingle', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A1', name: 'Heel Backward Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Heel Fwd Triangle', category: 'WHEELING', family: 'A' },
      { id: 'WHL-A2', name: 'Heel Fwd Square', category: 'WHEELING', family: 'A' },
      { id: 'WHL-B1', name: 'Toe Wheeling Flip', category: 'WHEELING', family: 'B' },
      { id: 'WHL-B1', name: 'Heel Wheeling Flip', category: 'WHEELING', family: 'B' },
      { id: 'WHL-B1', name: 'Toe Daynight Series', category: 'WHEELING', family: 'B' },
      { id: 'WHL-B1', name: 'Heel Daynight Series', category: 'WHEELING', family: 'B' },
      { id: 'WHL-C1', name: 'Toe Sewing Machine', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C2', name: 'Toe Back Wheeling', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C2', name: 'Heel Back Wheeling', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C3', name: 'Flat Noviper (shift)', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C3', name: 'Flat Internal (shift)', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C3', name: 'Flat External (shift)', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C3', name: 'Flat Fake (shift)', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C4', name: 'Toe Wheeling Fwd', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C4', name: 'Heel Wheeling Fwd', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C5', name: 'Flat Flip', category: 'WHEELING', family: 'C' },
      { id: 'WHL-C5', name: 'Flat Daynight Series', category: 'WHEELING', family: 'C' },
      { id: 'WHL-D1', name: 'Heel Toe Back Cross', category: 'WHEELING', family: 'D' },
      { id: 'WHL-D2', name: 'Heel Toe Back Snake', category: 'WHEELING', family: 'D' },
      { id: 'WHL-D1', name: 'Toe Toe Back Cross', category: 'WHEELING', family: 'D' },
      { id: 'WHL-D2', name: 'Toe Toe Back Snake', category: 'WHEELING', family: 'D' },
      { id: 'WHL-D1', name: 'Heel Toe Cross', category: 'WHEELING', family: 'D' },
      { id: 'WHL-D2', name: 'Heel Toe Snake', category: 'WHEELING', family: 'D' },
      { id: 'WHL-D1', name: 'Toe Toe Cross', category: 'WHEELING', family: 'D' },
      { id: 'WHL-D2', name: 'Toe Toe Snake', category: 'WHEELING', family: 'D' },
      { id: 'WHL-E1', name: 'Back One Foot', category: 'WHEELING', family: 'E' },
      { id: 'WHL-E2', name: 'One Foot', category: 'WHEELING', family: 'E' },
      { id: 'WHL-E3', name: 'Back Snake', category: 'WHEELING', family: 'E' },
      { id: 'WHL-E4', name: 'Back Cross', category: 'WHEELING', family: 'E' },
      { id: 'WHL-E5', name: 'Snake', category: 'WHEELING', family: 'E' },
      { id: 'WHL-E6', name: 'Cross', category: 'WHEELING', family: 'E' },
      { id: 'WHL-E5', name: 'Fish', category: 'WHEELING', family: 'E' },
      { id: 'WHL-E5', name: 'Backward Fish', category: 'WHEELING', family: 'E' },

      // SPINNING
      { id: 'SPN-A1', name: 'Back Toe Christie Spin', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A2', name: 'Toe Christie Spin', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A3', name: 'Back Toe Footgun Spin', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A4', name: 'Toe Footgun Spin', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A5', name: 'Toe Back Seven', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A5', name: 'Toe Back Chicken', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A6', name: 'Toe One Cone Back Seven', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A6', name: 'Toe One Cone Back Chicken', category: 'SPINNING', family: 'A' },
      { id: 'SPN-B1', name: 'Toe Seven', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B1', name: 'Toe Chicken', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B2', name: 'Toe One Cone Seven', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B2', name: 'Toe One Cone Chicken', category: 'SPINNING', family: 'B' },
      { id: 'SPN-A5', name: 'Heel Back Seven', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A5', name: 'Heel Back Chicken', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A6', name: 'Heel One Cone Back Seven', category: 'SPINNING', family: 'A' },
      { id: 'SPN-A6', name: 'Heel One Cone Back Chicken', category: 'SPINNING', family: 'A' },
      { id: 'SPN-B1', name: 'Heel Seven', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B1', name: 'Heel Chicken', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B2', name: 'Heel One Cone Seven', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B2', name: 'Heel One Cone Chicken', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B3', name: 'Flat Back Seven', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B3', name: 'Flat Back Chicken', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B4', name: 'Flat Seven', category: 'SPINNING', family: 'B' },
      { id: 'SPN-B4', name: 'Flat Chicken', category: 'SPINNING', family: 'B' },
      { id: 'SPN-C1', name: 'One Cone Back Korean Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-C2', name: 'Back Korean Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-C3', name: 'One Cone Korean Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-C4', name: 'Korean Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-C5', name: 'Back Toe Toe Wheel Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-C5', name: 'Back Heel Toe Wheel Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-C5', name: 'Back Heel Heel Wheel Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-C6', name: 'Toe Toe Wheel Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-C6', name: 'Heel Toe Wheel Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-C6', name: 'Heel Heel Wheel Spin', category: 'SPINNING', family: 'C' },
      { id: 'SPN-D1', name: 'Back J-Turn', category: 'SPINNING', family: 'D' },
      { id: 'SPN-D2', name: 'J-Turn', category: 'SPINNING', family: 'D' },
      { id: 'SPN-D3', name: 'Two Feet Spin', category: 'SPINNING', family: 'D' },
      { id: 'SPN-D4', name: 'Totalcross', category: 'SPINNING', family: 'D' },
      { id: 'SPN-E1', name: 'Italian', category: 'SPINNING', family: 'E' },
      { id: 'SPN-E1', name: 'Volt', category: 'SPINNING', family: 'E' },
      { id: 'SPN-E2', name: 'Crazy Sun', category: 'SPINNING', family: 'E' },
      { id: 'SPN-E2', name: 'Mexican', category: 'SPINNING', family: 'E' },
      { id: 'SPN-E3', name: 'Mabrouk', category: 'SPINNING', family: 'E' },
      { id: 'SPN-E3', name: 'Sun', category: 'SPINNING', family: 'E' }
    ];

const FAMILY_POINTS = {
      'A': { min: 50, max: 60 },
      'B': { min: 40, max: 50 },
      'C': { min: 30, max: 40 },
      'D': { min: 20, max: 30 },
      'E': { min: 10, max: 20 },
      'Custom': { min: 15, max: 35 }
    };

// Universal smart word-based search matcher for tricks and combos
function matchTrickKeywords(trickName, query) {
  if (!query || !query.trim()) return true;
  const rawTarget = String(trickName || '').toLowerCase();
  const rawQuery = String(query || '').toLowerCase().trim();
  
  // Direct substring match
  if (rawTarget.includes(rawQuery)) return true;

  // Multi-token word-based match: each word in the query must match a part of the trick name
  const queryTokens = rawQuery.split(/\s+/).filter(Boolean);
  return queryTokens.every(token => rawTarget.includes(token));
}

// Modular Performance Scoring Registry with Granular Per-Trick Sub-Checklist
const PERFORMANCE_SCORING_CONFIG = {
  minCompletedTricksRequired: 9,
  basePointsByFamily: {
    'A': 10,
    'B': 8,
    'C': 6,
    'D': 4,
    'E': 2,
    'Custom': 3
  },
  calculatePerformanceScore: function(perfData) {
    if (!perfData || !perfData.items) {
      return { totalScore: 0, completedCount: 0, totalIndividualTricks: 0, isValid: false, basePoints: 0, smoothness: 0, footwork: 0 };
    }
    let basePoints = 0;
    let completedCount = 0;
    let totalIndividualTricks = 0;

    perfData.items.forEach(it => {
      if (it.type === 'combo') {
        const comboList = Array.isArray(it.comboTricks) ? it.comboTricks.filter(Boolean) : (it.name ? it.name.split(' → ').filter(Boolean) : []);
        const comboTricksCount = Math.max(1, comboList.length);
        totalIndividualTricks += comboTricksCount;

        const subStatus = it.comboSubCompleted || {};
        let comboCompletedTricks = 0;

        for (let s = 0; s < comboTricksCount; s++) {
          if (subStatus[s] === true) {
            comboCompletedTricks++;
          }
        }

        completedCount += comboCompletedTricks;
        basePoints += (comboCompletedTricks * 3);
      } else {
        totalIndividualTricks += 1;
        if (it.completed) {
          completedCount += 1;
          const pts = this.basePointsByFamily[it.family] || 2;
          basePoints += (it.basePoints !== undefined ? Number(it.basePoints) : pts);
        }
      }
    });

    const smoothness = Number(perfData.smoothness || 0);
    const footwork = Number(perfData.footwork || 0);
    const totalScore = parseFloat((basePoints + smoothness + footwork).toFixed(2));
    const isValid = completedCount >= this.minCompletedTricksRequired;

    return {
      basePoints,
      smoothness,
      footwork,
      totalScore,
      completedCount,
      totalIndividualTricks,
      totalItems: perfData.items.length,
      isValid
    };
  }
};