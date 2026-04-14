/**
 * Electoral Data Import Script
 * 
 * Imports polling station data from IEBC Excel files into Supabase database.
 * Reads columns by HEADER NAME, not index position, to handle varying column orders.
 * 
 * Expected column headers (case-insensitive, partial match):
 * - County Code
 * - County Name
 * - Const Code / Constituency Code
 * - Const. Name / Constituency Name
 * - CAW Code / Ward Code
 * - CAW Name / Ward Name
 * - Reg. Centre Code / Registration Centre Code
 * - Reg. Centre Name / Registration Centre Name
 * - Polling Station Code
 * - Polling Station Name
 * - Registered Voters
 * 
 * Usage:
 *   npm run import:electoral                    # Import all files from data/
 *   npm run import:electoral -- --dry-run       # Validate without inserting
 *   npm run import:electoral -- --file path.xlsx # Import specific file
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface ExcelRow {
  countyCode: string;
  countyName: string;
  constituencyCode: string;
  constituencyName: string;
  wardCode: string;
  wardName: string;
  regCentreCode: string;
  regCentreName: string;
  stationCode: string;
  stationName: string;
  registeredVoters: number;
}

interface County {
  code: string;
  name: string;
}

interface Constituency {
  code: string;
  name: string;
  countyCode: string;
}

interface Ward {
  code: string;
  name: string;
  constituencyCode: string;
  countyCode: string;
}

interface PollingStation {
  code: string;
  name: string;
  stream: string | null;
  regCentreCode: string;
  regCentreName: string;
  wardCode: string;
  constituencyCode: string;
  countyCode: string;
  registeredVoters: number;
}

interface ImportStats {
  totalRows: number;
  filesProcessed: number;
  counties: number;
  constituencies: number;
  wards: number;
  pollingStations: number;
  totalRegisteredVoters: number;
  multiStreamCentres: number;
  errors: string[];
  warnings: string[];
}

// Column header mappings (lowercase patterns to match)
const COLUMN_PATTERNS = {
  countyCode: ['county code', 'county_code', 'countycode'],
  countyName: ['county name', 'county_name', 'countyname'],
  constituencyCode: ['const code', 'constituency code', 'const_code', 'constcode'],
  constituencyName: ['const.  name', 'const. name', 'const name', 'constituency name', 'constname'],
  wardCode: ['caw code', 'ward code', 'caw_code', 'wardcode'],
  wardName: ['caw name', 'ward name', 'caw_name', 'wardname'],
  regCentreCode: ['reg. centre code', 'reg centre code', 'registration centre code', 'regcentrecode'],
  regCentreName: ['reg. centre name', 'reg centre name', 'registration centre name', 'regcentrename'],
  stationCode: ['polling station code', 'station code', 'stationcode'],
  stationName: ['polling station name', 'station name', 'stationname'],
  registeredVoters: ['registered voters', 'registered_voters', 'registeredvoters', 'voters']
};

// Configuration
const DATA_DIR = path.join(process.cwd(), 'data');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const fileIndex = args.indexOf('--file');
const specificFile = fileIndex !== -1 ? args[fileIndex + 1] : null;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable');
}
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

/**
 * Find the column index for a given field based on header patterns
 */
function findColumnIndex(headers: string[], fieldName: keyof typeof COLUMN_PATTERNS): number {
  const patterns = COLUMN_PATTERNS[fieldName];
  const normalizedHeaders = headers.map(h => String(h || '').toLowerCase().trim());
  
  for (let i = 0; i < normalizedHeaders.length; i++) {
    for (const pattern of patterns) {
      if (normalizedHeaders[i].includes(pattern) || pattern.includes(normalizedHeaders[i])) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Create column mapping from headers
 */
function createColumnMapping(headers: string[]): Record<keyof typeof COLUMN_PATTERNS, number> {
  const mapping: Record<string, number> = {};
  
  for (const fieldName of Object.keys(COLUMN_PATTERNS) as Array<keyof typeof COLUMN_PATTERNS>) {
    const index = findColumnIndex(headers, fieldName);
    if (index === -1) {
      console.warn(`⚠️  Column not found for: ${fieldName}`);
    }
    mapping[fieldName] = index;
  }
  
  console.log('📋 Column mapping:');
  for (const [field, index] of Object.entries(mapping)) {
    console.log(`   ${field}: Column ${index >= 0 ? index + 1 : 'NOT FOUND'} (${index >= 0 ? headers[index] : '-'})`);
  }
  
  return mapping as Record<keyof typeof COLUMN_PATTERNS, number>;
}

/**
 * Parse a single Excel file and extract rows
 */
function parseExcelFile(filePath: string): ExcelRow[] {
  console.log(`\n📄 Reading: ${path.basename(filePath)}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });
  
  if (rawData.length < 2) {
    console.warn('⚠️  File has no data rows');
    return [];
  }
  
  // Get headers and create mapping
  const headers = rawData[0] as string[];
  const columnMap = createColumnMapping(headers);
  
  // Validate required columns
  const requiredFields: Array<keyof typeof COLUMN_PATTERNS> = ['countyCode', 'countyName', 'stationCode', 'registeredVoters'];
  const missingFields = requiredFields.filter(f => columnMap[f] === -1);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required columns: ${missingFields.join(', ')}`);
  }
  
  // Parse data rows
  const rows: ExcelRow[] = [];
  const dataRows = rawData.slice(1);
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as unknown[];
    
    // Skip empty rows
    if (!row || row.length === 0 || !row[columnMap.countyCode]) continue;
    
    try {
      const getValue = (field: keyof typeof COLUMN_PATTERNS): string => {
        const idx = columnMap[field];
        return idx >= 0 ? String(row[idx] || '').trim() : '';
      };
      
      const getNumValue = (field: keyof typeof COLUMN_PATTERNS): number => {
        const idx = columnMap[field];
        return idx >= 0 ? parseInt(String(row[idx] || '0'), 10) || 0 : 0;
      };
      
      const parsed: ExcelRow = {
        countyCode: getValue('countyCode').padStart(3, '0'),
        countyName: getValue('countyName').toUpperCase(),
        constituencyCode: getValue('constituencyCode').padStart(3, '0'),
        constituencyName: getValue('constituencyName').toUpperCase(),
        wardCode: getValue('wardCode').padStart(4, '0'),
        wardName: getValue('wardName').toUpperCase(),
        regCentreCode: getValue('regCentreCode').padStart(3, '0'),
        regCentreName: getValue('regCentreName').toUpperCase(),
        stationCode: getValue('stationCode'),
        stationName: getValue('stationName').toUpperCase(),
        registeredVoters: getNumValue('registeredVoters')
      };
      
      // Validate required fields
      if (!parsed.countyCode || !parsed.countyName || !parsed.stationCode) {
        continue;
      }
      
      rows.push(parsed);
    } catch (error) {
      console.warn(`⚠️  Row ${i + 2}: Parse error - ${error}`);
    }
  }
  
  console.log(`   ✅ Parsed ${rows.length} rows`);
  return rows;
}

/**
 * Parse all Excel files from data directory or a specific file
 */
function parseAllExcelFiles(): ExcelRow[] {
  let allRows: ExcelRow[] = [];
  let filesProcessed = 0;
  
  if (specificFile) {
    const filePath = path.isAbsolute(specificFile) ? specificFile : path.join(DATA_DIR, specificFile);
    allRows = parseExcelFile(filePath);
    filesProcessed = 1;
  } else {
    // Get all Excel files in data directory
    const files = fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
      .sort();
    
    console.log(`📂 Found ${files.length} Excel files in data/`);
    
    for (const file of files) {
      const filePath = path.join(DATA_DIR, file);
      try {
        const rows = parseExcelFile(filePath);
        allRows = allRows.concat(rows);
        filesProcessed++;
      } catch (error) {
        console.error(`❌ Error processing ${file}: ${error}`);
      }
    }
  }
  
  // Remove duplicates by station code
  const uniqueRows = new Map<string, ExcelRow>();
  for (const row of allRows) {
    const key = row.stationCode;
    if (!uniqueRows.has(key)) {
      uniqueRows.set(key, row);
    }
  }
  
  console.log(`\n📊 Total: ${allRows.length} rows from ${filesProcessed} files`);
  console.log(`   Unique polling stations: ${uniqueRows.size}`);
  
  return Array.from(uniqueRows.values());
}

/**
 * Assign stream letters (A, B, C...) to multi-stream polling stations
 */
function assignStreams(rows: ExcelRow[]): Map<string, string> {
  const streamMap = new Map<string, string>();
  const centreGroups = new Map<string, ExcelRow[]>();
  
  // Group by ward + registration centre
  for (const row of rows) {
    const key = `${row.countyCode}-${row.constituencyCode}-${row.wardCode}-${row.regCentreCode}`;
    if (!centreGroups.has(key)) {
      centreGroups.set(key, []);
    }
    centreGroups.get(key)!.push(row);
  }
  
  let multiStreamCount = 0;
  
  // Assign streams for centres with multiple stations
  for (const [, group] of centreGroups) {
    if (group.length > 1) {
      multiStreamCount++;
      // Sort by station code for consistent ordering
      group.sort((a, b) => a.stationCode.localeCompare(b.stationCode));
      group.forEach((station, index) => {
        const stream = String.fromCharCode(65 + index); // A, B, C...
        streamMap.set(station.stationCode, stream);
      });
    }
  }
  
  console.log(`📊 Found ${multiStreamCount} registration centres with multiple streams`);
  return streamMap;
}

/**
 * Extract unique entities from rows
 */
function extractEntities(rows: ExcelRow[], streamMap: Map<string, string>) {
  const counties = new Map<string, County>();
  const constituencies = new Map<string, Constituency>();
  const wards = new Map<string, Ward>();
  const pollingStations: PollingStation[] = [];
  
  for (const row of rows) {
    // Counties
    if (!counties.has(row.countyCode)) {
      counties.set(row.countyCode, {
        code: row.countyCode,
        name: row.countyName
      });
    }
    
    // Constituencies (unique by county + constituency code)
    const constKey = `${row.countyCode}-${row.constituencyCode}`;
    if (!constituencies.has(constKey)) {
      constituencies.set(constKey, {
        code: row.constituencyCode,
        name: row.constituencyName,
        countyCode: row.countyCode
      });
    }
    
    // Wards (unique by county + constituency + ward code)
    const wardKey = `${row.countyCode}-${row.constituencyCode}-${row.wardCode}`;
    if (!wards.has(wardKey)) {
      wards.set(wardKey, {
        code: row.wardCode,
        name: row.wardName,
        constituencyCode: row.constituencyCode,
        countyCode: row.countyCode
      });
    }
    
    // Polling Stations
    pollingStations.push({
      code: row.stationCode,
      name: row.stationName,
      stream: streamMap.get(row.stationCode) || null,
      regCentreCode: row.regCentreCode,
      regCentreName: row.regCentreName,
      wardCode: row.wardCode,
      constituencyCode: row.constituencyCode,
      countyCode: row.countyCode,
      registeredVoters: row.registeredVoters
    });
  }
  
  console.log(`\n📊 Extracted entities:`);
  console.log(`   - Counties: ${counties.size}`);
  console.log(`   - Constituencies: ${constituencies.size}`);
  console.log(`   - Wards: ${wards.size}`);
  console.log(`   - Polling Stations: ${pollingStations.length}`);
  
  return {
    counties: Array.from(counties.values()),
    constituencies: Array.from(constituencies.values()),
    wards: Array.from(wards.values()),
    pollingStations
  };
}

/**
 * Insert data into Supabase
 */
async function insertData(entities: ReturnType<typeof extractEntities>): Promise<ImportStats> {
  const stats: ImportStats = {
    totalRows: entities.pollingStations.length,
    filesProcessed: 0,
    counties: 0,
    constituencies: 0,
    wards: 0,
    pollingStations: 0,
    totalRegisteredVoters: 0,
    multiStreamCentres: 0,
    errors: [],
    warnings: []
  };
  
  // 1. Insert Counties
  console.log('\n📍 Inserting counties...');
  const countyIdMap = new Map<string, string>();
  
  for (const county of entities.counties) {
    const { data, error } = await supabase
      .from('counties')
      .upsert({ code: county.code, name: county.name }, { onConflict: 'code' })
      .select('id, code')
      .single();
    
    if (error) {
      stats.errors.push(`County ${county.code}: ${error.message}`);
    } else if (data) {
      countyIdMap.set(county.code, data.id);
      stats.counties++;
    }
  }
  console.log(`   ✅ Inserted ${stats.counties} counties`);
  
  // 2. Insert Constituencies
  console.log('\n📍 Inserting constituencies...');
  const constituencyIdMap = new Map<string, string>();
  
  for (const constituency of entities.constituencies) {
    const countyId = countyIdMap.get(constituency.countyCode);
    if (!countyId) {
      stats.errors.push(`Constituency ${constituency.code}: County ${constituency.countyCode} not found`);
      continue;
    }
    
    const fullCode = `${constituency.countyCode}-${constituency.code}`;
    const { data, error } = await supabase
      .from('constituencies')
      .upsert(
        { code: fullCode, name: constituency.name, county_id: countyId },
        { onConflict: 'code' }
      )
      .select('id, code')
      .single();
    
    if (error) {
      stats.errors.push(`Constituency ${fullCode}: ${error.message}`);
    } else if (data) {
      constituencyIdMap.set(fullCode, data.id);
      stats.constituencies++;
    }
  }
  console.log(`   ✅ Inserted ${stats.constituencies} constituencies`);
  
  // 3. Insert Wards
  console.log('\n📍 Inserting wards...');
  const wardIdMap = new Map<string, string>();
  
  for (const ward of entities.wards) {
    const constKey = `${ward.countyCode}-${ward.constituencyCode}`;
    const constituencyId = constituencyIdMap.get(constKey);
    
    if (!constituencyId) {
      stats.errors.push(`Ward ${ward.code}: Constituency ${constKey} not found`);
      continue;
    }
    
    const fullCode = `${ward.countyCode}-${ward.constituencyCode}-${ward.code}`;
    const { data, error } = await supabase
      .from('wards')
      .upsert(
        { code: fullCode, name: ward.name, constituency_id: constituencyId },
        { onConflict: 'code' }
      )
      .select('id, code')
      .single();
    
    if (error) {
      stats.errors.push(`Ward ${fullCode}: ${error.message}`);
    } else if (data) {
      wardIdMap.set(fullCode, data.id);
      stats.wards++;
    }
  }
  console.log(`   ✅ Inserted ${stats.wards} wards`);
  
  // 4. Insert Polling Stations (in batches)
  console.log('\n📍 Inserting polling stations...');
  const BATCH_SIZE = 100;
  
  for (let i = 0; i < entities.pollingStations.length; i += BATCH_SIZE) {
    const batch = entities.pollingStations.slice(i, i + BATCH_SIZE);
    const records = [];
    
    for (const station of batch) {
      const wardKey = `${station.countyCode}-${station.constituencyCode}-${station.wardCode}`;
      const wardId = wardIdMap.get(wardKey);
      
      if (!wardId) {
        stats.warnings.push(`Station ${station.code}: Ward ${wardKey} not found`);
        continue;
      }
      
      records.push({
        code: station.code,
        name: station.name,
        stream: station.stream,
        reg_centre_code: station.regCentreCode,
        reg_centre_name: station.regCentreName,
        ward_id: wardId,
        registered_voters: station.registeredVoters
      });
      
      stats.totalRegisteredVoters += station.registeredVoters;
      if (station.stream) stats.multiStreamCentres++;
    }
    
    if (records.length > 0) {
      const { error } = await supabase
        .from('polling_stations')
        .upsert(records, { onConflict: 'code,stream' });
      
      if (error) {
        stats.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        stats.pollingStations += records.length;
      }
    }
    
    // Progress indicator
    const progress = Math.round((i + batch.length) / entities.pollingStations.length * 100);
    process.stdout.write(`   Progress: ${progress}% (${stats.pollingStations.toLocaleString()} stations)\r`);
  }
  console.log(`\n   ✅ Inserted ${stats.pollingStations.toLocaleString()} polling stations`);
  
  // 5. Aggregate registered voters
  console.log('\n📊 Aggregating registered voters...');
  
  // First, sync denormalized counts on base tables
  const { error: syncError } = await supabase.rpc('sync_registered_voter_counts');
  if (syncError) {
    console.log(`   ⚠️  sync_registered_voter_counts: ${syncError.message}`);
  }
  
  // Then refresh materialized views
  const { error: refreshError } = await supabase.rpc('refresh_voter_aggregation_views');
  if (refreshError) {
    console.log(`   ⚠️  refresh_voter_aggregation_views: ${refreshError.message}`);
  }

  // Fallback: use the old aggregate function
  const { error: wardAggError } = await supabase.rpc('aggregate_registered_voters');
  if (wardAggError) {
    console.log(`   ⚠️  aggregate_registered_voters: ${wardAggError.message}`);
    // If function doesn't exist, do it manually
    console.log('   Running manual aggregation...');
    
    // Update wards
    await supabase.from('wards').select('id').then(async ({ data: wardsList }) => {
      if (wardsList) {
        for (const ward of wardsList) {
          const { data: voterSum } = await supabase
            .from('polling_stations')
            .select('registered_voters')
            .eq('ward_id', ward.id);
          
          if (voterSum) {
            const total = voterSum.reduce((sum, ps) => sum + (ps.registered_voters || 0), 0);
            await supabase.from('wards').update({ registered_voters: total }).eq('id', ward.id);
          }
        }
      }
    });
  }
  
  console.log('   ✅ Aggregation complete');
  
  return stats;
}

/**
 * Print import summary
 */
function printSummary(stats: ImportStats) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`   Total Rows Processed:    ${stats.totalRows.toLocaleString()}`);
  console.log(`   Counties:                ${stats.counties}`);
  console.log(`   Constituencies:          ${stats.constituencies}`);
  console.log(`   Wards:                   ${stats.wards.toLocaleString()}`);
  console.log(`   Polling Stations:        ${stats.pollingStations.toLocaleString()}`);
  console.log(`   Multi-Stream Stations:   ${stats.multiStreamCentres.toLocaleString()}`);
  console.log(`   Total Registered Voters: ${stats.totalRegisteredVoters.toLocaleString()}`);
  console.log('='.repeat(60));
  
  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.slice(0, 10).forEach(e => console.log(`   - ${e}`));
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }
  
  if (stats.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    stats.warnings.slice(0, 5).forEach(w => console.log(`   - ${w}`));
    if (stats.warnings.length > 5) {
      console.log(`   ... and ${stats.warnings.length - 5} more warnings`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🗳️  myVote Kenya - Electoral Data Import');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no database changes)' : 'LIVE IMPORT'}`);
  console.log(`Source: ${specificFile || 'All files in data/'}`);
  console.log(`Supabase: ${supabaseUrl}`);
  console.log('='.repeat(60) + '\n');
  
  try {
    // Parse all Excel files
    const rows = parseAllExcelFiles();
    
    if (rows.length === 0) {
      console.log('❌ No data rows found. Check your Excel files.');
      process.exit(1);
    }
    
    // Assign streams
    const streamMap = assignStreams(rows);
    
    // Extract entities
    const entities = extractEntities(rows, streamMap);
    
    if (isDryRun) {
      console.log('\n✅ Dry run complete. No data was inserted.');
      console.log(`   Would insert:`);
      console.log(`   - ${entities.counties.length} counties`);
      console.log(`   - ${entities.constituencies.length} constituencies`);
      console.log(`   - ${entities.wards.length} wards`);
      console.log(`   - ${entities.pollingStations.length} polling stations`);
      
      const totalVoters = entities.pollingStations.reduce((sum, ps) => sum + ps.registeredVoters, 0);
      console.log(`   - ${totalVoters.toLocaleString()} total registered voters`);
    } else {
      // Insert into database
      const stats = await insertData(entities);
      printSummary(stats);
      
      if (stats.errors.length === 0) {
        console.log('\n✅ Import completed successfully!');
      } else {
        console.log('\n⚠️  Import completed with some errors. Please review.');
      }
    }
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

main();
