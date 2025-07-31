// scripts/update-businesses.ts
// Run this with: npx tsx scripts/update-businesses.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!; // Use service key for admin access

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateExistingBusinesses() {
    console.log('🔄 Starting business update...\n');

    try {
        // 1. First, check if businesses table exists and what data we have
        const { data: existingClients, error: clientError } = await supabase
            .from('clients')
            .select('*');

        if (clientError) {
            console.error('Error fetching clients:', clientError);
            return;
        }

        console.log(`Found ${existingClients?.length || 0} clients in the system\n`);

        // 2. Check if businesses already exist
        const { data: existingBusinesses, error: businessError } = await supabase
            .from('businesses')
            .select('*');

        if (businessError && businessError.code !== 'PGRST116') { // PGRST116 = table doesn't exist
            console.error('Error fetching businesses:', businessError);
            return;
        }

        console.log(`Found ${existingBusinesses?.length || 0} existing businesses\n`);

        // 3. Create/Update businesses based on clients
        if (existingClients && existingClients.length > 0) {
            for (const client of existingClients) {
                // Check if business already exists with this name
                const existingBusiness = existingBusinesses?.find(b =>
                    b.name === client.name || b.pixel_id === client.meta_pixel_id
                );

                if (existingBusiness) {
                    console.log(`✅ Business "${client.name}" already exists`);
                } else {
                    // Create new business
                    const { data: newBusiness, error: createError } = await supabase
                        .from('businesses')
                        .insert({
                            name: client.name || client.company_name || 'Unnamed Business',
                            description: `Migrated from client: ${client.company_name || client.name}`,
                            pixel_id: client.meta_pixel_id || null,
                            is_active: client.is_active ?? true,
                        })
                        .select()
                        .single();

                    if (createError) {
                        console.error(`❌ Error creating business for ${client.name}:`, createError);
                    } else {
                        console.log(`✅ Created business: ${newBusiness.name} (ID: ${newBusiness.id})`);
                    }
                }
            }
        }

        // 4. Update any google_conversions records that don't have business_id
        console.log('\n🔄 Updating google_conversions records...');

        const { data: conversionsWithoutBusiness } = await supabase
            .from('google_conversions')
            .select('id')
            .is('business_id', null)
            .limit(1000);

        if (conversionsWithoutBusiness && conversionsWithoutBusiness.length > 0) {
            // Get the first business to assign orphaned conversions to
            const { data: firstBusiness } = await supabase
                .from('businesses')
                .select('id')
                .limit(1)
                .single();

            if (firstBusiness) {
                const { error: updateError } = await supabase
                    .from('google_conversions')
                    .update({ business_id: firstBusiness.id })
                    .is('business_id', null);

                if (updateError) {
                    console.error('❌ Error updating conversions:', updateError);
                } else {
                    console.log(`✅ Updated ${conversionsWithoutBusiness.length} conversion records with business_id`);
                }
            }
        }

        console.log('\n✅ Business update complete!');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the update
updateExistingBusinesses();