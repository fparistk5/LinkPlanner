import { supabase } from '../config/supabase'

async function seedData() {
  try {
    // Create default groups with different colors
    const groups = [
      { name: 'Work', color: '#FF5733' },
      { name: 'Personal', color: '#33FF57' },
      { name: 'Learning', color: '#3357FF' },
      { name: 'Entertainment', color: '#F333FF' },
      { name: 'Social', color: '#FF33F3' },
      { name: 'Other', color: '#33FFF3' }
    ]

    // Insert groups
    const { data: insertedGroups, error: groupsError } = await supabase
      .from('groups')
      .insert(groups)
      .select()

    if (groupsError) throw groupsError
    console.log('Created groups:', insertedGroups)

    // Create a test link
    const { data: testLink, error: linkError } = await supabase
      .from('links')
      .insert({
        title: 'Example Link',
        url: 'https://example.com',
        // Don't set group_id initially, so it appears in ungrouped
      })
      .select()

    if (linkError) throw linkError
    console.log('Created test link:', testLink)

    console.log('Data seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding data:', error)
  }
}

// Execute the function
seedData() 