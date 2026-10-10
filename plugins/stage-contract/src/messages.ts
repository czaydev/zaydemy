export default {
	tr: {
		permissions: { contracts: { manage: "Sözleşmeleri yönet" } },
		contract: {
			stage: "Sözleşme",
			nav: "Sözleşmeler",
			options: { policy: "Sözleşme metni", policyHint: "Kullanılacak politika metninin anahtarı." },
			title: "Kayıt sözleşmesi",
			none: "Onayınızı bekleyen bir sözleşme yok.",
			accept: "Okudum, onaylıyorum",
			missing: "Sözleşme metni henüz hazırlanmadı. Kurum sizinle iletişime geçecek.",
			admin: {
				title: "Sözleşme bekleyen başvurular",
				applicant: "Başvuran",
				application: "Başvuru",
				markSigned: "İmzalandı olarak işaretle",
				empty: "Sözleşme bekleyen başvuru yok.",
			},
		},
	},
	en: {
		permissions: { contracts: { manage: "Manage contracts" } },
		contract: {
			stage: "Contract",
			nav: "Contracts",
			options: { policy: "Contract text", policyHint: "Key of the policy that holds the text." },
			title: "Enrolment contract",
			none: "No contract is waiting for your approval.",
			accept: "I have read and accept",
			missing: "The contract text is not ready yet. The institution will contact you.",
			admin: {
				title: "Applications waiting for a contract",
				applicant: "Applicant",
				application: "Application",
				markSigned: "Mark as signed",
				empty: "No application is waiting for a contract.",
			},
		},
	},
};
