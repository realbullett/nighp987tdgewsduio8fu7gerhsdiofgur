import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';

const OffsetsPage: React.FC = () => {
    const [content, setContent] = useState<string>('');

    useEffect(() => {
        const fetchOffsets = async () => {
            const { data, error } = await supabase
                .from('offsets')
                .select('content')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                setContent(data.content);
            }
        };

        fetchOffsets();
    }, []);

    return (
        <pre style={{
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            padding: '20px',
            margin: 0,
            backgroundColor: '#050505',
            color: '#e2e8f0',
            minHeight: '100vh',
            fontSize: '14px'
        }}>
            {content}
        </pre>
    );
};

export default OffsetsPage;
