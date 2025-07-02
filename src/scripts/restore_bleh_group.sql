-- First, verify the Bleh profile exists
DO $$
DECLARE
    bleh_profile_id INTEGER;
BEGIN
    -- Get the Bleh profile ID
    SELECT id INTO bleh_profile_id
    FROM network_profiles
    WHERE name = 'Bleh';

    IF bleh_profile_id IS NULL THEN
        RAISE EXCEPTION 'Bleh profile not found';
    END IF;

    -- Set the profile context
    PERFORM set_config('app.profile_id', bleh_profile_id::text, true);

    -- Create the hello group
    INSERT INTO groups (
        name,
        color,
        display_order,
        note_group_id,
        parent_group_id,
        profile_id
    ) VALUES (
        'hello',
        '#3b82f6',
        1,
        NULL,
        NULL,
        58
    );

    -- Verify the group was created
    RAISE NOTICE 'Created hello group for Bleh profile (ID: %)', bleh_profile_id;
END $$; 