import React, { useState } from 'react';
import CompanySearch from './CompanySearch';
import CompanyDetail from './CompanyDetail';

const Research = () => {
    const [selectedCompany, setSelectedCompany] = useState<any | null>(null);

    return (
        <div className="min-h-screen pt-12">
            {selectedCompany ? (
                <CompanyDetail
                    company={selectedCompany}
                    onBack={() => setSelectedCompany(null)}
                />
            ) : (
                <CompanySearch
                    onCompanySelect={(company) => setSelectedCompany(company)}
                />
            )}
        </div>
    );
};

export default Research;
