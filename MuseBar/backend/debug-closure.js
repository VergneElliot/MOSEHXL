const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mosehxl_development',
  password: 'postgres',
  port: 5432,
});

async function debugClosure() {
  try {
    console.log('🔍 Diagnostic détaillé du système de clôture...\n');
    
    // 1. Vérifier le bulletin de clôture du samedi 05/07
    console.log('📊 Bulletin de clôture du samedi 05/07:');
    const saturdayClosure = await pool.query(`
      SELECT * FROM closure_bulletins 
      WHERE period_start::date = '2025-07-05' 
      ORDER BY period_start DESC LIMIT 1
    `);
    
    if (saturdayClosure.rows.length === 0) {
      console.log('❌ AUCUN bulletin de clôture trouvé pour le samedi 05/07!');
      return;
    }
    
    const closure = saturdayClosure.rows[0];
    console.log(`✅ Bulletin trouvé: ${closure.closure_type}`);
    console.log(`   Période: ${closure.period_start} à ${closure.period_end}`);
    console.log(`   Clôturé: ${closure.is_closed}`);
    console.log(`   Hash: ${closure.closure_hash.substring(0, 8)}...`);
    
    // 2. Lister toutes les commandes du samedi 05/07
    console.log('\n📋 Commandes du samedi 05/07:');
    const saturdayOrders = await pool.query(`
      SELECT id, total_amount, created_at, status, notes 
      FROM orders 
      WHERE DATE(created_at) = '2025-07-05'
      ORDER BY created_at ASC
    `);
    
    if (saturdayOrders.rows.length === 0) {
      console.log('❌ Aucune commande trouvée pour le samedi 05/07');
    } else {
      saturdayOrders.rows.forEach((order, i) => {
        console.log(`${i + 1}. Commande #${order.id} - ${order.total_amount}€ - ${order.created_at} - ${order.status}`);
        if (order.notes && order.notes.includes('ANNULATION')) {
          console.log(`   ⚠️  C'est une commande d'annulation!`);
        }
      });
    }
    
    // 3. Tester la logique de vérification pour chaque commande du samedi
    console.log('\n🧪 Test de vérification pour chaque commande du samedi:');
    for (const order of saturdayOrders.rows) {
      console.log(`\n   Commande #${order.id} (${order.created_at}):`);
      
      const closureCheckQuery = `
        SELECT 1 FROM closure_bulletins
        WHERE is_closed = TRUE
          AND period_start <= $1
          AND period_end >= $1
        LIMIT 1
      `;
      const closureCheckResult = await pool.query(closureCheckQuery, [order.created_at]);
      
      if (closureCheckResult.rows.length > 0) {
        console.log(`   ✅ BLOQUÉE - Dans période clôturée`);
      } else {
        console.log(`   ❌ AUTORISÉE - Pas dans période clôturée`);
        console.log(`   ⚠️  PROBLÈME: Cette commande aurait dû être bloquée!`);
      }
    }
    
    // 4. Vérifier les commandes d'annulation récentes
    console.log('\n🔄 Commandes d\'annulation récentes:');
    const cancellationOrders = await pool.query(`
      SELECT id, total_amount, created_at, notes 
      FROM orders 
      WHERE notes LIKE '%ANNULATION%'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (cancellationOrders.rows.length === 0) {
      console.log('❌ Aucune commande d\'annulation trouvée');
    } else {
      cancellationOrders.rows.forEach((order, i) => {
        console.log(`${i + 1}. Commande #${order.id} - ${order.total_amount}€ - ${order.created_at}`);
        console.log(`   Note: ${order.notes}`);
      });
    }
    
    // 5. Test de la requête SQL avec des dates précises
    console.log('\n🔬 Test de la requête SQL avec des dates précises:');
    const testDate = new Date('2025-07-05T23:29:51.000Z'); // Date de la commande #54
    console.log(`   Date de test: ${testDate}`);
    console.log(`   Période bulletin: ${closure.period_start} à ${closure.period_end}`);
    
    const preciseCheck = await pool.query(`
      SELECT 
        $1 as test_date,
        $2 as period_start,
        $3 as period_end,
        $1 >= $2 as after_start,
        $1 <= $3 as before_end,
        ($1 >= $2 AND $1 <= $3) as in_period
    `, [testDate, closure.period_start, closure.period_end]);
    
    const result = preciseCheck.rows[0];
    console.log(`   Après début: ${result.after_start}`);
    console.log(`   Avant fin: ${result.before_end}`);
    console.log(`   Dans période: ${result.in_period}`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

debugClosure(); 