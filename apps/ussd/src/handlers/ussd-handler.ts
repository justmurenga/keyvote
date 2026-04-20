import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizePhone, formatCurrency, truncate } from '@myvote/shared';
import type { Database, ElectoralPosition } from '@myvote/database';

interface UssdRequest {
  sessionId: string;
  serviceCode: string;
  phoneNumber: string;
  text: string;
}

type Tables = Database['public']['Tables'];

export class UssdHandler {
  private supabase: SupabaseClient<Database>;

  constructor() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase credentials');
    }

    this.supabase = createClient<Database>(url, key);
  }

  /**
   * Process USSD request and return response
   */
  async processRequest(request: UssdRequest): Promise<string> {
    const { phoneNumber, text } = request;
    const normalizedPhone = normalizePhone(phoneNumber);
    const inputs = text ? text.split('*') : [];

    // Check if user exists
    const user = await this.getUser(normalizedPhone);

    // First request - show main menu
    if (inputs.length === 0 || inputs[0] === '') {
      return this.getMainMenu(user);
    }

    // Route based on first selection
    const mainChoice = inputs[0];

    switch (mainChoice) {
      case '1':
        return this.handlePollingStation(user, inputs.slice(1));
      case '2':
        return this.handleFollowCandidate(user, inputs.slice(1));
      case '3':
        return this.handlePolls(user, inputs.slice(1));
      case '4':
        return this.handleResults(user, inputs.slice(1));
      case '5':
        return this.handleWallet(user, inputs.slice(1));
      case '6':
        return this.handleProfile(user, normalizedPhone, inputs.slice(1));
      case '0':
        return this.getHelp();
      default:
        return 'END Invalid option. Please dial *123# to try again.';
    }
  }

  /**
   * Get user from database by phone
   */
  private async getUser(phone: string) {
    const { data } = await this.supabase
      .from('users')
      .select(`
        *,
        polling_station:polling_stations(
          id, name, stream,
          ward:wards(
            id, name,
            constituency:constituencies(
              id, name,
              county:counties(id, name)
            )
          )
        )
      `)
      .eq('phone', phone)
      .single();

    return data;
  }

  /**
   * Main menu
   */
  private getMainMenu(user: unknown): string {
    const greeting = user ? 'Welcome back to myVote!' : 'Welcome to myVote Kenya!';
    return `CON ${greeting}

1. Check My Polling Station
2. Follow a Candidate
3. Opinion Polls
4. Election Results
5. My Wallet
6. My Profile
0. Help`;
  }

  /**
   * Handle polling station lookup
   */
  private async handlePollingStation(user: unknown, inputs: string[]): Promise<string> {
    if (!user) {
      return 'END You are not registered. Please register on myvote.ke or call 0800 123 456.';
    }

    const userData = user as Tables['users']['Row'] & {
      polling_station?: {
        name: string;
        stream?: string;
        ward?: {
          name: string;
          constituency?: {
            name: string;
            county?: { name: string };
          };
        };
      };
    };

    if (!userData.polling_station) {
      return `END Your polling station is not set.
      
Visit myvote.ke or call 0800 123 456 to update your profile.`;
    }

    const ps = userData.polling_station;
    const ward = ps.ward?.name || 'N/A';
    const constituency = ps.ward?.constituency?.name || 'N/A';
    const county = ps.ward?.constituency?.county?.name || 'N/A';
    const stream = ps.stream ? ` (Stream ${ps.stream})` : '';

    return `END Your Polling Station:

${ps.name}${stream}

Ward: ${ward}
Constituency: ${constituency}
County: ${county}

For more details, visit myvote.ke`;
  }

  /**
   * Handle following candidates
   */
  private async handleFollowCandidate(user: unknown, inputs: string[]): Promise<string> {
    if (!user) {
      return 'END Please register first at myvote.ke to follow candidates.';
    }

    const positions: { key: string; value: ElectoralPosition; label: string }[] = [
      { key: '1', value: 'president', label: 'President' },
      { key: '2', value: 'governor', label: 'Governor' },
      { key: '3', value: 'senator', label: 'Senator' },
      { key: '4', value: 'women_rep', label: "Women's Rep" },
      { key: '5', value: 'mp', label: 'MP' },
      { key: '6', value: 'mca', label: 'MCA' },
    ];

    // First level - show positions
    if (inputs.length === 0) {
      return `CON Select position:

${positions.map((p) => `${p.key}. ${p.label}`).join('\n')}
0. Back`;
    }

    const positionChoice = inputs[0];
    if (positionChoice === '0') {
      return this.getMainMenu(user);
    }

    const position = positions.find((p) => p.key === positionChoice);
    if (!position) {
      return 'END Invalid position. Please try again.';
    }

    // Get candidates for position
    const userData = user as Tables['users']['Row'];
    const { data: candidates } = await this.supabase
      .from('candidates')
      .select('id, user:users(full_name), party:political_parties(abbreviation)')
      .eq('position', position.value)
      .eq('is_verified', true)
      .limit(5);

    if (!candidates || candidates.length === 0) {
      return `END No verified candidates found for ${position.label}.

Check back later or visit myvote.ke`;
    }

    // Show candidates
    if (inputs.length === 1) {
      const candidateList = candidates
        .map((c: any, i: number) => {
          const name = c.user?.full_name || 'Unknown';
          const party = c.party?.abbreviation || 'IND';
          return `${i + 1}. ${truncate(name, 15)} (${truncate(party, 8)})`;
        })
        .join('\n');

      return `CON ${position.label} Candidates:

${candidateList}
0. Back`;
    }

    // Follow selected candidate
    const candidateIndex = parseInt(inputs[1]) - 1;
    if (candidateIndex < 0 || candidateIndex >= candidates.length) {
      return 'END Invalid selection. Please try again.';
    }

    const selectedCandidate = candidates[candidateIndex] as any;
    
    // Check if already following
    const { data: existing } = await this.supabase
      .from('followers')
      .select('id')
      .eq('user_id', userData.id)
      .eq('candidate_id', selectedCandidate.id)
      .single();

    if (existing) {
      const name = selectedCandidate.user?.full_name || 'Unknown';
      return `END You are already following ${name}.

Manage follows at myvote.ke`;
    }

    // Create follow
    await (this.supabase.from('followers') as any).insert({
      user_id: userData.id,
      candidate_id: selectedCandidate.id,
    });

    const name = selectedCandidate.user?.full_name || 'Unknown';
    return `END Successfully following ${name}!

You will receive updates via SMS.`;
  }

  /**
   * Handle opinion polls
   */
  private async handlePolls(user: unknown, inputs: string[]): Promise<string> {
    if (!user) {
      return 'END Please register first at myvote.ke to participate in polls.';
    }

    const userData = user as Tables['users']['Row'];

    // Get active polls
    const { data: polls } = await this.supabase
      .from('polls')
      .select('id, question, options, position')
      .eq('is_active', true)
      .lt('starts_at', new Date().toISOString())
      .gt('ends_at', new Date().toISOString())
      .limit(3);

    if (!polls || polls.length === 0) {
      return `END No active polls available.

Check back later or visit myvote.ke`;
    }

    // Show poll list
    if (inputs.length === 0) {
      const pollList = polls
        .map((p: any, i: number) => `${i + 1}. ${truncate(p.question, 30)}`)
        .join('\n');

      return `CON Active Polls:

${pollList}
0. Back`;
    }

    // Show specific poll
    const pollIndex = parseInt(inputs[0]) - 1;
    if (pollIndex < 0 || pollIndex >= polls.length) {
      return 'END Invalid selection. Please try again.';
    }

    const poll = polls[pollIndex] as any;
    const options = (poll.options || []) as string[];

    if (inputs.length === 1) {
      const optionList = options
        .map((opt: string, i: number) => `${i + 1}. ${truncate(opt, 25)}`)
        .join('\n');

      return `CON ${truncate(poll.question, 50)}

${optionList}
0. Back`;
    }

    // Submit vote
    const optionIndex = parseInt(inputs[1]) - 1;
    if (optionIndex < 0 || optionIndex >= options.length) {
      return 'END Invalid option. Please try again.';
    }

    // Check if already voted
    const { data: existingVote } = await this.supabase
      .from('poll_votes')
      .select('id')
      .eq('poll_id', poll.id)
      .eq('user_id', userData.id)
      .single();

    if (existingVote) {
      return 'END You have already voted in this poll.';
    }

    // Submit vote
    await (this.supabase.from('poll_votes') as any).insert({
      poll_id: poll.id,
      user_id: userData.id,
      option_index: optionIndex,
    });

    return `END Vote submitted!

You voted: ${options[optionIndex]}

View full results at myvote.ke`;
  }

  /**
   * Handle election results
   */
  private async handleResults(user: unknown, inputs: string[]): Promise<string> {
    // This would show aggregated election results
    // For now, return a placeholder
    return `END Election Results

Results will be available during election period.

Visit myvote.ke for live updates and detailed analysis.`;
  }

  /**
   * Handle wallet operations
   */
  private async handleWallet(user: unknown, inputs: string[]): Promise<string> {
    if (!user) {
      return 'END Please register first at myvote.ke to use wallet features.';
    }

    const userData = user as Tables['users']['Row'];

    // Get wallet
    const { data: wallet } = await this.supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userData.id)
      .single();

    // Show wallet menu
    if (inputs.length === 0) {
      return `CON My Wallet

1. Check Balance
2. Top Up (M-Pesa)
3. Transaction History
0. Back`;
    }

    switch (inputs[0]) {
      case '1':
        // Check balance
        const balance = (wallet as any)?.balance || 0;
        return `END Your Balance: ${formatCurrency(balance)}

Top up via M-Pesa Paybill: 123456
Account: Your phone number`;

      case '2':
        // Top up instructions
        return `END To top up your wallet:

1. Go to M-Pesa
2. Select Lipa na M-Pesa
3. Select Paybill
4. Enter Business No: 123456
5. Account No: Your phone
6. Enter amount

Your wallet will be credited automatically.`;

      case '3':
        // Transaction history
        const { data: transactions } = await this.supabase
          .from('wallet_transactions')
          .select('amount, type, created_at')
          .eq('wallet_id', (wallet as any)?.id || '')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!transactions || transactions.length === 0) {
          return 'END No recent transactions.';
        }

        const txList = transactions
          .map((tx: any) => {
            const sign = tx.type === 'credit' ? '+' : '-';
            return `${sign}${formatCurrency(tx.amount)}`;
          })
          .join('\n');

        return `END Recent Transactions:

${txList}

Full history at myvote.ke`;

      default:
        return 'END Invalid option.';
    }
  }

  /**
   * Handle profile management
   */
  private async handleProfile(
    user: unknown,
    phone: string,
    inputs: string[]
  ): Promise<string> {
    if (!user) {
      return `END Not registered.

To register:
1. Visit myvote.ke
2. Call 0800 123 456
3. WhatsApp: +254 700 000 000`;
    }

    const userData = user as Tables['users']['Row'];

    // Show profile menu
    if (inputs.length === 0) {
      return `CON My Profile

1. View Profile
2. Update Location
3. Notification Settings
0. Back`;
    }

    switch (inputs[0]) {
      case '1':
        // View profile
        const name = userData.full_name || 'Unknown';
        return `END Profile:

Name: ${name}
Phone: ${phone}
Role: ${userData.role || 'Voter'}

Edit profile at myvote.ke`;

      case '2':
        // Update location (simplified)
        return `END To update your location:

1. Visit myvote.ke
2. Go to Profile > Settings
3. Update Polling Station

Or WhatsApp "UPDATE" to +254 700 000 000`;

      case '3':
        // Notification settings
        return `CON Notifications:

1. Enable SMS
2. Disable SMS
0. Back`;

      default:
        return 'END Invalid option.';
    }
  }

  /**
   * Help information
   */
  private getHelp(): string {
    return `END myVote Kenya Help

Dial *123# to access:
- Polling station info
- Follow candidates
- Opinion polls
- Election results
- Digital wallet

Support:
Tel: 0800 123 456
WhatsApp: +254 700 000 000
Web: myvote.ke`;
  }
}
