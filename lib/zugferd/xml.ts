import { format } from "date-fns";
import { de } from "date-fns/locale";
import { calculateLineTotal } from "@/lib/invoice/calculations";
import { ZugferdDocumentInput } from "@/lib/zugferd/types";

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toDate102(value: string) {
  return format(new Date(value), "yyyyMMdd", { locale: de });
}

function amount(value: number) {
  return value.toFixed(2);
}

function taxCategoryCode(vatRate: number) {
  return vatRate === 0 ? "Z" : "S";
}

export function generateZugferdXml({ invoice, totals }: ZugferdDocumentInput) {
  const lineItemsXml = invoice.lineItems
    .map((item, idx) => {
      const lineNet = calculateLineTotal(item);
      const vatRate = invoice.kleinunternehmerMode ? 0 : item.vatRate;
      return `
      <ram:IncludedSupplyChainTradeLineItem>
        <ram:AssociatedDocumentLineDocument>
          <ram:LineID>${idx + 1}</ram:LineID>
        </ram:AssociatedDocumentLineDocument>
        <ram:SpecifiedTradeProduct>
          <ram:Name>${xmlEscape(item.description)}</ram:Name>
        </ram:SpecifiedTradeProduct>
        <ram:SpecifiedLineTradeAgreement>
          <ram:NetPriceProductTradePrice>
            <ram:ChargeAmount>${amount(item.unitPriceNet)}</ram:ChargeAmount>
          </ram:NetPriceProductTradePrice>
        </ram:SpecifiedLineTradeAgreement>
        <ram:SpecifiedLineTradeDelivery>
          <ram:BilledQuantity unitCode="C62">${item.quantity}</ram:BilledQuantity>
        </ram:SpecifiedLineTradeDelivery>
        <ram:SpecifiedLineTradeSettlement>
          <ram:ApplicableTradeTax>
            <ram:TypeCode>VAT</ram:TypeCode>
            <ram:CategoryCode>${taxCategoryCode(vatRate)}</ram:CategoryCode>
            <ram:RateApplicablePercent>${vatRate}</ram:RateApplicablePercent>
          </ram:ApplicableTradeTax>
          <ram:SpecifiedTradeSettlementLineMonetarySummation>
            <ram:LineTotalAmount>${amount(lineNet)}</ram:LineTotalAmount>
          </ram:SpecifiedTradeSettlementLineMonetarySummation>
        </ram:SpecifiedLineTradeSettlement>
      </ram:IncludedSupplyChainTradeLineItem>`;
    })
    .join("\n");

  const taxesXml = totals.breakdown
    .map(
      (row) => `
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${amount(row.tax)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${amount(row.net)}</ram:BasisAmount>
        <ram:CategoryCode>${taxCategoryCode(row.vatRate)}</ram:CategoryCode>
        <ram:RateApplicablePercent>${row.vatRate}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>`,
    )
    .join("\n");

  const notes = [invoice.invoice.paymentTerms, invoice.notes]
    .filter(Boolean)
    .map((note) => `<ram:IncludedNote><ram:Content>${xmlEscape(note ?? "")}</ram:Content></ram:IncludedNote>`)
    .join("\n");

  const sellerTaxRegistration = invoice.seller.vatId
    ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xmlEscape(invoice.seller.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>`
    : `<ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">${xmlEscape(invoice.seller.taxId ?? "")}</ram:ID></ram:SpecifiedTaxRegistration>`;

  const buyerVatXml = invoice.buyer.vatId
    ? `<ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">${xmlEscape(invoice.buyer.vatId)}</ram:ID></ram:SpecifiedTaxRegistration>`
    : "";

  const exemptionNote = invoice.kleinunternehmerMode
    ? `<ram:IncludedNote><ram:Content>Gemäß §19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).</ram:Content></ram:IncludedNote>`
    : "";

  const reverseChargeNote = invoice.reverseCharge
    ? `<ram:IncludedNote><ram:Content>Steuerschuldnerschaft des Leistungsempfängers (Reverse Charge).</ram:Content></ram:IncludedNote>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:basic</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${xmlEscape(invoice.number)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    ${notes}
    ${exemptionNote}
    ${reverseChargeNote}
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${toDate102(invoice.invoice.issueDate)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${lineItemsXml}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${xmlEscape(invoice.seller.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${xmlEscape(invoice.seller.postalCode)}</ram:PostcodeCode>
          <ram:LineOne>${xmlEscape(invoice.seller.street)}</ram:LineOne>
          <ram:CityName>${xmlEscape(invoice.seller.city)}</ram:CityName>
          <ram:CountryID>${xmlEscape(invoice.seller.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:DefinedTradeContact>
          <ram:PersonName>${xmlEscape(invoice.seller.name)}</ram:PersonName>
          ${invoice.seller.phone ? `<ram:TelephoneUniversalCommunication><ram:CompleteNumber>${xmlEscape(invoice.seller.phone)}</ram:CompleteNumber></ram:TelephoneUniversalCommunication>` : ""}
          ${invoice.seller.email ? `<ram:EmailURIUniversalCommunication><ram:URIID>${xmlEscape(invoice.seller.email)}</ram:URIID></ram:EmailURIUniversalCommunication>` : ""}
        </ram:DefinedTradeContact>
        ${sellerTaxRegistration}
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${xmlEscape(invoice.buyer.name)}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>${xmlEscape(invoice.buyer.postalCode)}</ram:PostcodeCode>
          <ram:LineOne>${xmlEscape(invoice.buyer.street)}</ram:LineOne>
          <ram:CityName>${xmlEscape(invoice.buyer.city)}</ram:CityName>
          <ram:CountryID>${xmlEscape(invoice.buyer.country)}</ram:CountryID>
        </ram:PostalTradeAddress>
        ${buyerVatXml}
      </ram:BuyerTradeParty>
      ${invoice.invoice.reference ? `<ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>${xmlEscape(invoice.invoice.reference)}</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>` : ""}
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${toDate102(invoice.invoice.deliveryDate)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${invoice.invoice.currency}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:Information>SEPA-Überweisung</ram:Information>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>${xmlEscape(invoice.seller.iban)}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>${xmlEscape(invoice.seller.bic)}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      ${taxesXml}
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>${xmlEscape(invoice.invoice.paymentTerms)}</ram:Description>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${toDate102(invoice.invoice.dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${amount(totals.netTotal)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${amount(totals.netTotal)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">${amount(totals.taxTotal)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${amount(totals.grossTotal)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${amount(totals.grossTotal)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}
